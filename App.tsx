
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SIGNALING_SERVER_URL, STUN_SERVERS, LOBBY_ROOM_ID } from './constants';
import { generatePeerName, generateRoomCode, formatFileSize } from './utils/helpers';
import { Peer, DisplayMessage, MessageType, AppMessage, FileInfoMessage, FileTransfer } from './types';
import DeviceCard from './components/DeviceCard';
import RoomCodeModal from './components/RoomCodeModal';
import JoinRoomModal from './components/JoinRoomModal';
import ConfirmationModal from './components/ConfirmationModal';
import ChatInterface from './components/ChatInterface';
import Icon from './components/Icon';

// This is a type definition for the global JSZip object injected by the script.
declare global {
  interface Window {
    JSZip: any;
  }
}

const App: React.FC = () => {
    const [self, setSelf] = useState<Peer>({ id: '', name: generatePeerName() });
    const [peers, setPeers] = useState<Peer[]>([]);
    const [connectedPeer, setConnectedPeer] = useState<Peer | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const [ws, setWs] = useState<WebSocket | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);

    const [roomCode, setRoomCode] = useState<string>('');
    const [showRoomCodeModal, setShowRoomCodeModal] = useState(false);
    const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
    const [joinRoomError, setJoinRoomError] = useState('');

    const [incomingRequest, setIncomingRequest] = useState<{ peer: Peer; type: 'connect' | 'file'; fileInfo?: FileInfoMessage } | null>(null);

    const [fileTransfer, setFileTransfer] = useState<FileTransfer | null>(null);
    const receivedFileChunks = useRef<ArrayBuffer[]>([]);
    const receivedFileSize = useRef(0);
    const fileToSend = useRef<File | null>(null);

    // Initialization
    useEffect(() => {
        connectToSignalingServer();
        const roomCodeFromUrl = window.location.hash.substring(1);
        if (roomCodeFromUrl) {
            setShowJoinRoomModal(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const connectToSignalingServer = useCallback(() => {
        const socket = new WebSocket(SIGNALING_SERVER_URL);
        
        socket.onopen = () => {
            console.log("Connected to signaling server.");
            const peerId = Math.random().toString(36).substring(2);
            setSelf(s => ({...s, id: peerId}));
            setWs(socket);
            socket.send(JSON.stringify({ type: 'join', roomId: LOBBY_ROOM_ID, peer: {id: peerId, name: self.name} }));
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'room-peers':
                    setPeers(data.peers.filter((p: Peer) => p.id !== self.id));
                    break;
                case 'peer-joined':
                    if (data.peer.id !== self.id) setPeers(p => [...p, data.peer]);
                    break;
                case 'peer-left':
                    setPeers(p => p.filter(peer => peer.id !== data.peerId));
                    if (connectedPeer?.id === data.peerId) {
                        handleDisconnect();
                    }
                    break;
                case 'offer':
                    handleOffer(data.offer, data.from);
                    break;
                case 'answer':
                    await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
                    break;
                case 'candidate':
                    await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
                    break;
                case 'error':
                    if(data.message.includes("not found")){
                        setJoinRoomError("Room not found or is empty.");
                    }
                    console.error('Signaling error:', data.message);
                    break;
            }
        };

        socket.onclose = () => {
            console.log("Disconnected from signaling server. Reconnecting...");
            setWs(null);
            setPeers([]);
            if(connectedPeer) handleDisconnect();
            setTimeout(connectToSignalingServer, 3000);
        };
        
        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            socket.close();
        };

    }, [self.id, self.name, connectedPeer]);

    const sendSignal = (type: string, payload: object) => {
        ws?.send(JSON.stringify({ type, ...payload }));
    };

    const createPeerConnection = (peer: Peer) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('candidate', { to: peer.id, candidate: event.candidate });
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel);
        };
        
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setIsConnecting(false);
                setConnectedPeer(peer);
                setShowJoinRoomModal(false);
                setShowRoomCodeModal(false);
                window.location.hash = '';
                setMessages([{id: Date.now().toString(), sender: 'me', type: 'status', content: `You are now connected to ${peer.name}`}]);
            } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                handleDisconnect();
            }
        }

        peerConnection.current = pc;
        return pc;
    };

    const setupDataChannel = (channel: RTCDataChannel) => {
        dataChannel.current = channel;
        channel.binaryType = 'arraybuffer';

        channel.onmessage = (event) => {
            if (typeof event.data === 'string') {
                const msg: AppMessage = JSON.parse(event.data);
                switch(msg.type) {
                    case MessageType.TEXT:
                        setMessages(m => [...m, {id: Date.now().toString(), sender: 'peer', type: 'text', content: msg.content}]);
                        break;
                    case MessageType.FILE_INFO:
                        setIncomingRequest({ peer: connectedPeer!, type: 'file', fileInfo: msg });
                        break;
                    case MessageType.FILE_RECEIVED:
                        setFileTransfer(ft => ft ? ({...ft, status: 'complete'}) : null);
                        addMessage('status', `${fileToSend.current?.name} sent successfully.`);
                        fileToSend.current = null;
                        break;
                    case MessageType.TRANSFER_CANCELLED:
                         setFileTransfer(ft => ft ? ({...ft, status: 'cancelled'}) : null);
                         addMessage('status', `File transfer was cancelled.`);
                         fileToSend.current = null;
                         receivedFileChunks.current = [];
                         receivedFileSize.current = 0;
                        break;
                }
            } else { // ArrayBuffer (file chunk)
                receivedFileChunks.current.push(event.data);
                receivedFileSize.current += event.data.byteLength;

                setFileTransfer(ft => {
                    if (ft) {
                        const progress = (receivedFileSize.current / ft.size) * 100;
                        return {...ft, progress};
                    }
                    return null;
                });

                if (receivedFileSize.current === fileTransfer?.size) {
                    const fileBlob = new Blob(receivedFileChunks.current);
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(fileBlob);
                    link.download = fileTransfer.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    addMessage('file', `Downloaded ${fileTransfer.name}`, fileTransfer.name, fileTransfer.size);
                    setFileTransfer(ft => ft ? ({...ft, status: 'complete'}) : null);
                    receivedFileChunks.current = [];
                    receivedFileSize.current = 0;
                    
                    sendDataChannelMessage({type: MessageType.FILE_RECEIVED});
                }
            }
        };
    };
    
    const sendDataChannelMessage = (message: AppMessage) => {
        dataChannel.current?.send(JSON.stringify(message));
    };

    const handleConnect = async (peer: Peer) => {
        setIncomingRequest({peer, type: 'connect'});
    };

    const acceptConnection = async (peer: Peer) => {
        setIsConnecting(true);
        const pc = createPeerConnection(peer);
        const channel = pc.createDataChannel('file-transfer');
        setupDataChannel(channel);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('offer', { to: peer.id, offer });
        setIncomingRequest(null);
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, from: Peer) => {
        setIncomingRequest({ peer: from, type: 'connect'});
        
        peerConnection.current?.close(); // close any existing connection
        
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // This part will be completed by user action (accepting connection)
    };
    
    const acceptOffer = (peer: Peer) => {
        setIsConnecting(true);
        sendSignal('answer', { to: peer.id, answer: peerConnection.current?.localDescription });
        setIncomingRequest(null);
    }
    
    const declineRequest = () => {
        // Optionally send a 'decline' signal
        setIncomingRequest(null);
        peerConnection.current?.close();
        peerConnection.current = null;
    }

    const handleDisconnect = () => {
        addMessage('status', `Disconnected from ${connectedPeer?.name}.`);
        peerConnection.current?.close();
        peerConnection.current = null;
        dataChannel.current?.close();
        dataChannel.current = null;
        setConnectedPeer(null);
        setMessages([]);
        setFileTransfer(null);
        fileToSend.current = null;
        receivedFileChunks.current = [];
        receivedFileSize.current = 0;
        ws?.send(JSON.stringify({ type: 'join', roomId: LOBBY_ROOM_ID, peer: self }));
    };
    
    const addMessage = (type: 'text' | 'file' | 'status', content: string, fileName?: string, fileSize?: number) => {
        const newMessage: DisplayMessage = {
            id: Date.now().toString(),
            sender: 'me',
            type,
            content,
            fileName,
            fileSize
        };
        setMessages(m => [...m, newMessage]);
    };

    // UI actions
    const handleCreateRoom = () => {
        const code = generateRoomCode();
        setRoomCode(code);
        sendSignal('create-room', { roomId: code, peer: self });
        setShowRoomCodeModal(true);
    };

    const handleJoinRoom = (code: string) => {
        sendSignal('join', { roomId: code, peer: self });
    };

    const handleSendMessage = (text: string) => {
        addMessage('text', text);
        sendDataChannelMessage({type: MessageType.TEXT, content: text});
    };

    const handleSendFiles = async (files: FileList) => {
        if (!files.length || fileTransfer?.status === 'sending' || fileTransfer?.status === 'receiving') return;

        let file: File;
        let isZip = false;

        if (files.length > 1) {
            const zip = new window.JSZip();
            for (let i = 0; i < files.length; i++) {
                zip.file(files[i].name, files[i]);
            }
            const blob = await zip.generateAsync({ type: "blob" });
            file = new File([blob], "archive.zip", { type: "application/zip" });
            isZip = true;
        } else {
            file = files[0];
        }
        
        fileToSend.current = file;
        setFileTransfer({ name: file.name, size: file.size, isZip, status: 'pending', progress: 0, isSender: true });
        
        sendDataChannelMessage({ type: MessageType.FILE_INFO, name: file.name, size: file.size, isZip });
    };
    
    const acceptFile = () => {
        if (!incomingRequest?.fileInfo) return;
        const { name, size, isZip } = incomingRequest.fileInfo;
        setFileTransfer({ name, size, isZip, status: 'receiving', progress: 0, isSender: false });
        receivedFileChunks.current = [];
        receivedFileSize.current = 0;
        setIncomingRequest(null);
        // Note: No confirmation sent back yet. The file chunks will start arriving.
    }
    
    const declineFile = () => {
        sendDataChannelMessage({type: MessageType.TRANSFER_CANCELLED});
        setIncomingRequest(null);
    }
    
    const cancelTransfer = () => {
        sendDataChannelMessage({type: MessageType.TRANSFER_CANCELLED});
        setFileTransfer(ft => ft ? ({...ft, status: 'cancelled'}) : null);
        fileToSend.current = null;
        receivedFileChunks.current = [];
        receivedFileSize.current = 0;
        addMessage('status', 'File transfer cancelled.');
    }

    useEffect(() => {
        if (fileTransfer?.status === 'pending' && fileTransfer.isSender && fileToSend.current) {
            const file = fileToSend.current;
            const chunkSize = 16 * 1024; // 16KB
            let offset = 0;
            const reader = new FileReader();

            reader.onload = (e) => {
                if (!e.target?.result || dataChannel.current?.readyState !== 'open') {
                    cancelTransfer();
                    return;
                }
                dataChannel.current.send(e.target.result as ArrayBuffer);
                offset += (e.target.result as ArrayBuffer).byteLength;
                
                setFileTransfer(ft => {
                    if (ft) {
                        const progress = (offset / file.size) * 100;
                        return {...ft, progress};
                    }
                    return null;
                });
                
                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    // File sending is technically complete from sender side, waiting for receiver confirmation
                }
            };
            
            const readSlice = (o: number) => {
                const slice = file.slice(o, o + chunkSize);
                reader.readAsArrayBuffer(slice);
            };
            
            setFileTransfer(ft => ft ? {...ft, status: 'sending'} : null);
            readSlice(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileTransfer?.status]);
    
    // Main Render Logic
    if (connectedPeer) {
        return <ChatInterface 
            self={self} 
            peer={connectedPeer}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendFiles={handleSendFiles}
            onDisconnect={handleDisconnect}
            fileTransfer={fileTransfer}
            onCancelTransfer={cancelTransfer}
        />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <header className="text-center mb-8">
                <div className="flex justify-center items-center space-x-2">
                   <Icon name="zap" className="text-blue-400" size={32} />
                   <h1 className="text-4xl font-bold">DropPeer</h1>
                </div>
                <p className="text-gray-400 mt-2">Secure P2P file sharing. Simple, fast, and private.</p>
            </header>

            <main className="w-full max-w-4xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="sm:col-span-1">
                        <DeviceCard name={self.name} isSelf={true} />
                    </div>
                    <div className="sm:col-span-2 flex flex-col space-y-4 justify-center">
                        <button onClick={handleCreateRoom} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                            <Icon name="plus-circle" size={20} />
                            <span>Create Private Room</span>
                        </button>
                        <button onClick={() => setShowJoinRoomModal(true)} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                             <Icon name="log-in" size={20} />
                            <span>Join with Code</span>
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-center">Nearby Devices</h2>
                    {!ws || isConnecting ? (
                       <div className="text-center py-8 text-gray-400">
                         {isConnecting ? 'Connecting...' : 'Connecting to network...'}
                         <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto mt-2 animate-pulse"></div>
                       </div>
                    ) : peers.length === 0 ? (
                        <p className="text-center py-8 text-gray-400">No other devices found in the public lobby. <br/> Ask someone to open this page on the same network.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {peers.map(peer => (
                                <DeviceCard 
                                    key={peer.id} 
                                    name={peer.name} 
                                    isSelf={false} 
                                    onClick={() => handleConnect(peer)} 
                                    status="online"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
            
            <RoomCodeModal isOpen={showRoomCodeModal} onClose={() => setShowRoomCodeModal(false)} roomCode={roomCode} />
            <JoinRoomModal isOpen={showJoinRoomModal} onClose={() => { setShowJoinRoomModal(false); setJoinRoomError(''); }} onJoin={handleJoinRoom} error={joinRoomError} />
            
            <ConfirmationModal 
                isOpen={!!incomingRequest}
                onConfirm={() => {
                    if (incomingRequest?.type === 'connect') {
                         if(peerConnection.current?.remoteDescription){ // We received an offer
                             acceptOffer(incomingRequest.peer);
                         } else { // We are initiating
                             acceptConnection(incomingRequest.peer);
                         }
                    } else if (incomingRequest?.type === 'file') {
                        acceptFile();
                    }
                }}
                onDecline={declineRequest}
                title={incomingRequest?.type === 'file' ? 'Incoming File Transfer' : 'Connection Request'}
                message={
                    incomingRequest?.type === 'file' 
                        ? `${connectedPeer?.name} wants to send you "${incomingRequest.fileInfo?.name}" (${formatFileSize(incomingRequest.fileInfo?.size ?? 0)}). Do you accept?`
                        : `${incomingRequest?.peer.name} wants to connect with you. Do you accept?`
                }
            />

        </div>
    );
};

export default App;

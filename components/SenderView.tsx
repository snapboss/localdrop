
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileMetadata } from '../types';
import { CodeBlock } from './CodeBlock';
import { FileSelector } from './FileSelector';
import { ProgressBar } from './ProgressBar';
import { FileIcon } from './icons';

const CHUNK_SIZE = 64 * 1024; // 64 KB

const rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const SenderView: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [offer, setOffer] = useState<string>('');
    const [answer, setAnswer] = useState<string>('');
    const [status, setStatus] = useState<string>('Select a file to begin.');
    const [progress, setProgress] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);

    const resetState = useCallback(() => {
        setFile(null);
        setOffer('');
        setAnswer('');
        setStatus('Select a file to begin.');
        setProgress(0);
        setIsConnected(false);
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (dataChannel.current) {
            dataChannel.current.close();
            dataChannel.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, []);

    const createOffer = useCallback(async (selectedFile: File) => {
        resetState();
        setFile(selectedFile);
        setStatus('Creating connection offer...');
        setProgress(0);

        try {
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnection.current = pc;

            const dc = pc.createDataChannel('file-transfer');
            dataChannel.current = dc;

            dc.onopen = () => {
                console.log('Data channel open');
                setIsConnected(true);
                setStatus('Connected! Sending file...');
                sendFileInChunks(selectedFile);
            };

            dc.onclose = () => {
                console.log('Data channel closed');
                setStatus('Connection closed.');
                setIsConnected(false);
            };

            pc.onicecandidateerror = (e) => {
                console.error("ICE candidate error:", e);
                setStatus(`Error: ICE candidate failed. ${e.type}`);
            }

            const offerSdp = await pc.createOffer();
            await pc.setLocalDescription(offerSdp);

            // Wait for ICE gathering to complete
            await new Promise<void>(resolve => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkState = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', checkState);
                }
            });

            if (pc.localDescription) {
                setOffer(JSON.stringify(pc.localDescription));
                setStatus('Offer created. Send it to the receiver.');
            }
        } catch (error) {
            console.error('Error creating offer:', error);
            setStatus(`Error: Could not create connection offer. ${error}`);
        }
    }, [resetState]);

    const handleConnect = async () => {
        if (!answer || !peerConnection.current) {
            setStatus('Error: Paste the answer from the receiver first.');
            return;
        }

        try {
            const remoteDesc = new RTCSessionDescription(JSON.parse(answer));
            await peerConnection.current.setRemoteDescription(remoteDesc);
            setStatus('Connecting...');
        } catch (error) {
            console.error('Error setting remote description:', error);
            setStatus(`Error: Invalid answer or connection failed. ${error}`);
        }
    };
    
    const sendFileInChunks = (fileToSend: File) => {
        const fileReader = new FileReader();
        let offset = 0;
    
        const metadata: FileMetadata = {
            name: fileToSend.name,
            size: fileToSend.size,
            type: fileToSend.type,
        };
        dataChannel.current?.send(JSON.stringify(metadata));
    
        fileReader.onload = (e) => {
            if (!e.target?.result || !dataChannel.current) return;
    
            const chunk = e.target.result as ArrayBuffer;
            dataChannel.current.send(chunk);
            offset += chunk.byteLength;
    
            const currentProgress = (offset / fileToSend.size) * 100;
            setProgress(currentProgress);
    
            if (offset < fileToSend.size) {
                readSlice(offset);
            } else {
                setStatus(`File "${fileToSend.name}" sent successfully!`);
            }
        };
    
        const readSlice = (o: number) => {
            const slice = fileToSend.slice(o, o + CHUNK_SIZE);
            fileReader.readAsArrayBuffer(slice);
        };
    
        readSlice(0);
    };

    return (
        <div className="space-y-6">
            {!file && <FileSelector onFileSelect={createOffer} />}
            
            {file && (
                 <div className="p-4 bg-gray-700/50 rounded-lg flex items-center space-x-4">
                    <FileIcon className="h-8 w-8 text-indigo-400 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={resetState} className="ml-auto bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm">
                        Cancel
                    </button>
                </div>
            )}

            {offer && !isConnected && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">1. Send Offer to Receiver</h3>
                        <CodeBlock text={offer} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">2. Paste Answer from Receiver</h3>
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Paste the receiver's answer here"
                            className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-xs text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        onClick={handleConnect}
                        disabled={!answer}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors"
                    >
                        Connect
                    </button>
                </div>
            )}
            
            <div className="mt-4">
                <p className="text-sm text-center text-gray-400">{status}</p>
                {progress > 0 && <ProgressBar progress={progress} />}
            </div>
        </div>
    );
};

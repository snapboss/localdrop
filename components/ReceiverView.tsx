
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileMetadata } from '../types';
import { CodeBlock } from './CodeBlock';
import { ProgressBar } from './ProgressBar';

const rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const ReceiverView: React.FC = () => {
    const [offer, setOffer] = useState('');
    const [answer, setAnswer] = useState('');
    const [status, setStatus] = useState('Waiting for connection offer from a sender.');
    const [progress, setProgress] = useState(0);
    const [fileInfo, setFileInfo] = useState<FileMetadata | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const receivedChunks = useRef<ArrayBuffer[]>([]);
    const receivedSize = useRef<number>(0);

    const resetState = useCallback(() => {
        setOffer('');
        setAnswer('');
        setStatus('Waiting for connection offer from a sender.');
        setProgress(0);
        setFileInfo(null);
        receivedChunks.current = [];
        receivedSize.current = 0;
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, []);

    const createAnswer = async () => {
        if (!offer) {
            setStatus('Error: Paste the offer first.');
            return;
        }

        try {
            resetState();
            setOffer(offer); // Keep offer in state
            setStatus('Creating answer...');

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnection.current = pc;

            pc.ondatachannel = (event) => {
                const dataChannel = event.channel;
                dataChannel.onmessage = handleDataChannelMessage;
                dataChannel.onopen = () => setStatus('Connection established. Waiting for file...');
                dataChannel.onclose = () => {
                    if (fileInfo && receivedSize.current < fileInfo.size) {
                        setStatus('Connection closed prematurely. Transfer failed.');
                    }
                };
            };

            const remoteDesc = new RTCSessionDescription(JSON.parse(offer));
            await pc.setRemoteDescription(remoteDesc);

            const answerSdp = await pc.createAnswer();
            await pc.setLocalDescription(answerSdp);

            await new Promise<void>(resolve => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    pc.addEventListener('icegatheringstatechange', () => {
                        if (pc.iceGatheringState === 'complete') resolve();
                    });
                }
            });

            if (pc.localDescription) {
                setAnswer(JSON.stringify(pc.localDescription));
                setStatus('Answer created. Send it back to the sender.');
            }
        } catch (error) {
            console.error('Error creating answer:', error);
            setStatus(`Error: Could not create answer. Invalid offer. ${error}`);
        }
    };
    
    const handleDataChannelMessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
            const metadata: FileMetadata = JSON.parse(event.data);
            setFileInfo(metadata);
            receivedChunks.current = [];
            receivedSize.current = 0;
            setStatus(`Receiving file: ${metadata.name}`);
            setProgress(0);
        } else {
            receivedChunks.current.push(event.data);
            receivedSize.current += event.data.byteLength;

            if (fileInfo) {
                const currentProgress = (receivedSize.current / fileInfo.size) * 100;
                setProgress(currentProgress);

                if (receivedSize.current === fileInfo.size) {
                    setStatus('File received successfully! Downloading...');
                    const fileBlob = new Blob(receivedChunks.current, { type: fileInfo.type });
                    const url = URL.createObjectURL(fileBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileInfo.name;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    setTimeout(resetState, 3000);
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">1. Paste Offer from Sender</h3>
                <textarea
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="Paste the sender's offer here"
                    className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-xs text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={!!answer}
                />
            </div>
            
            {!answer && (
                <button
                    onClick={createAnswer}
                    disabled={!offer}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                    Generate Answer
                </button>
            )}

            {answer && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">2. Send Answer to Sender</h3>
                    <CodeBlock text={answer} />
                </div>
            )}
            
            <div className="mt-4">
                <p className="text-sm text-center text-gray-400">{status}</p>
                 {(progress > 0 || fileInfo) && <ProgressBar progress={progress} />}
            </div>

            {answer && (
                 <button onClick={resetState} className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                    Start Over
                </button>
            )}
        </div>
    );
};

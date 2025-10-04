import { useEffect, useState } from 'react';
import socket from '../socket.ts';

type ChatMessage = { from?: string; text: string };

export default function App() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		function onConnect() {
			setConnected(true);
			console.log('Connected:', socket.id);
			socket.emit('ping');
		}
		function onDisconnect() {
			setConnected(false);
		}
		function onPong() {
			console.log('Pong nhận được');
		}
		function onChat(data: ChatMessage) {
			setMessages((prev) => [...prev, data]);
		}

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);
		socket.on('pong', onPong);
		socket.on('chat:message', onChat);

			return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
			socket.off('pong', onPong);
			socket.off('chat:message', onChat);
				// không đóng socket singleton khi unmount
		};
	}, [socket]);

	const sendMessage = () => {
		socket.emit('chat:message', { text: 'Hello từ React' });
	};

	return (
		<div style={{ maxWidth: 600, margin: '40px auto', color: '#fff', fontFamily: 'system-ui' }}>
			<h2>React Chat Test</h2>
			<div style={{ marginBottom: 12 }}>
					Trạng thái: {connected ? 'Đã kết nối' : 'Mất kết nối'}
			</div>
			<button onClick={sendMessage}>Send Hello</button>
			<div style={{ marginTop: 16 }}>
				{messages.map((m, i) => (
					<p key={i}>
						{m.from ? `${m.from}: ` : ''}
						{m.text}
					</p>
				))}
			</div>
		</div>
	);
}

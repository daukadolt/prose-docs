import { useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

function Navbar() {
    const [selectedOption, setSelectedOption] = useState('Spell check');
    const { provider } = useWebSocket();

    const handleRunAI = () => {
        if (!provider || !provider.ws) {
            console.error('WebSocket connection not available');
            return;
        }

        const message = {
            type: 'ai-request',
            action: selectedOption.toLowerCase().replace(' ', '-'),
            timestamp: Date.now()
        };

        console.log('Sending AI request:', message);
        provider.ws.send(JSON.stringify(message));
    };

    return (
        <div className="w-full h-10 flex">
            <div className="h-full py-2">
                <img className="max-w-full max-h-full bg-green-100" src="/marker-plain.png" alt="Marker"/>
            </div>
            <div className="h-full ml-auto mr-4">
                <select 
                    className="h-full" 
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                >
                    <option value="Spell check">Spell check</option>
                    <option value="Fact check">Fact check</option>
                </select>
                <button onClick={handleRunAI}>Run AI</button>
            </div>
        </div>
    );
}

export default Navbar;
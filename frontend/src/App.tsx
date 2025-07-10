import Editor from './components/Editor'
import Navbar from './components/Navbar'
import { WebSocketProvider } from './contexts/WebSocketContext'

function App() {
  return (
    <WebSocketProvider>
      <div className="w-screen h-screen">
            <Navbar/>
            <Editor/>
      </div>
    </WebSocketProvider>
  )
}

export default App

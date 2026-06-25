import { BrowserRouter, Routes, Route } from "react-router-dom"
import Host from "./views/Host"
import Player from "./views/Player"

export default function App() {
  return (
    <BrowserRouter basename="/colombiaatodocolombiano">
      <Routes>
        <Route path="/" element={<Host />} />
        <Route path="/jugar" element={<Player />} />
      </Routes>
    </BrowserRouter>
  )
}

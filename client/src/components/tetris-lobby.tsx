"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"

type Tab = "welcome" | "room" | "match" | "game"

export default function TetrisLobby() {
  const [activeTab, setActiveTab] = useState<Tab>("welcome")
  const [message, setMessage] = useState("")
  const [chatMessages, setChatMessages] = useState([
    { user: "System", text: "Welcome to chat! Please remember to be civil to your opponents." },
  ])

  const roomCode = "#GWDH"
  const username = "TRUMVN"
  const userLevel = "9"
  const userWins = 0
  const userLosses = 0

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      setChatMessages([...chatMessages, { user: username, text: message }])
      setMessage("")
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Button variant="ghost" className="text-lg font-bold hover:bg-secondary">
          EXIT
        </Button>

        <button
          onClick={copyRoomCode}
          className="flex items-center gap-2 px-6 py-2 bg-secondary hover:bg-secondary/80 rounded text-muted-foreground transition-colors group"
        >
          <span className="text-xs uppercase tracking-wider">Click to copy URL</span>
          <span className="text-xl font-bold text-foreground">{roomCode}</span>
          <span className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>
            📋
          </span>
        </button>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-secondary rounded transition-colors relative">
            <span className="text-lg" aria-hidden>
              👥
            </span>
            <span className="absolute -top-1 -right-1 bg-muted text-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              0+
            </span>
          </button>
          <button className="p-2 hover:bg-secondary rounded transition-colors">
            <span className="text-lg" aria-hidden>
              🔔
            </span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded">
            <span className="font-bold text-lg">{username}</span>
            <span className="text-primary font-bold">{userLevel}/</span>
          </div>
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold">T</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Players */}
        <aside className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold uppercase tracking-wider">Players (1)</h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇻🇳</span>
                  <div>
                    <div className="font-bold">{username}</div>
                    <div className="text-sm text-primary">{userLevel}/</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">HOST</span>
                  <span className="text-sm">
                    {userWins} / {userLosses}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Center - Main Content */}
        <main className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card">
            <div className="flex items-center justify-center">
              <h1 className="text-2xl font-bold uppercase tracking-wider py-6">{username}&apos;s Private Room</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6">
              {(["welcome", "room", "match", "game"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 uppercase tracking-wider font-bold transition-colors ${
                    activeTab === tab
                      ? "bg-background text-foreground border-t-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <ScrollArea className="flex-1 p-8">
            {activeTab === "welcome" && (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">Welcome to TETRIO!</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                    TETR.IO IS A FREE-TO-WIN FAMILIAR YET FAST-PACED ONLINE STACKER IN THE SAME GENRE AS TETRIS, AND
                    PLAYED BY MILLIONS ACROSS THE GLOBE.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    YOU JUST CREATED AN ONLINE GAME - YOU CAN START THE GAME ONCE TWO PLAYERS ARE IN THE ROOM (AND NOT
                    SPECTATING)!
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-4 uppercase text-muted-foreground">
                    Your currently set keybinds are:
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">MOVE FALLING PIECE LEFT</span>
                      <span className="text-sm">ARROWLEFT, LEFT, NUMPAD4, BUTTON_14</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">MOVE FALLING PIECE RIGHT</span>
                      <span className="text-sm">ARROWRIGHT, RIGHT, NUMPAD6, BUTTON_15</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">SOFT DROP</span>
                      <span className="text-sm">ARROWDOWN, DOWN, NUMPAD2, BUTTON_13</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">HARD DROP</span>
                      <span className="text-sm">SPACE, NUMPAD8, BUTTON_12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">ROTATE CLOCKWISE</span>
                      <span className="text-sm">X, ARROWUP, UP, NUMPAD1, NUMPAD5, NUMPAD9</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">ROTATE COUNTER-CLOCKWISE</span>
                      <span className="text-sm">Z, CONTROL, NUMPAD3, BUTTON_10</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">ROTATE 180°</span>
                      <span className="text-sm">A, NUMPAD7, BUTTON_11</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">HOLD</span>
                      <span className="text-sm">C, SHIFT, NUMPAD0, BUTTON_16</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "room" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold mb-4 uppercase">Room Settings</h2>
                <p className="text-muted-foreground">Configure your room settings here...</p>
              </div>
            )}

            {activeTab === "match" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold mb-4 uppercase">Match Settings</h2>
                <p className="text-muted-foreground">Configure match rules and settings...</p>
              </div>
            )}

            {activeTab === "game" && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold mb-4 uppercase">Game Settings</h2>
                <p className="text-muted-foreground">Configure gameplay settings...</p>
              </div>
            )}
          </ScrollArea>
        </main>

        {/* Right Sidebar - Chat */}
        <aside className="w-96 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold uppercase tracking-wider">Chat</h2>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="text-muted-foreground">{msg.user}:</span> <span>{msg.text}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="message..."
              className="bg-secondary border-border text-sm"
            />
          </form>
        </aside>
      </div>

      {/* Bottom Bar */}
      <footer className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
        <div>
          <div className="text-2xl font-bold uppercase tracking-wider">Playing</div>
          <div className="text-xs text-muted-foreground uppercase">Click to switch to spectators</div>
        </div>

        <Button
          size="lg"
          className="px-16 py-6 text-2xl font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Start
        </Button>

        <div className="text-right">
          <div className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Versus Knockout</div>
          <div className="text-xs text-muted-foreground uppercase">FT: 3 • WB: 2</div>
        </div>
      </footer>
    </div>
  )
}

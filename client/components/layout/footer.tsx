import React from 'react'
import Link from 'next/link'
import { Github, Bot, ExternalLink } from 'lucide-react'

export function Footer() {    
  return (
    <footer className="w-full border-t bg-background py-4">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
            <span>Built by</span>
            <Link 
              href="https://austinwalela.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline underline-offset-2 decoration-dotted hover:text-foreground transition-colors"
            >
              Austin Walela
            </Link>
            <span className="mx-1">+</span>
            <Link
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-foreground transition-colors"
            >
              <Bot size={14} className="mx-0.5" />
              <span className="underline underline-offset-2 decoration-dotted">Claude 3.7</span>
            </Link>
          </div>
          <Link 
            href="https://github.com/walela/gp" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm border border-purple-200 bg-purple-50 text-purple-700 rounded-full px-2.5 py-0.5 transition-colors hover:bg-purple-100 hover:border-purple-300"
          >
            <Github size={14} />
            <span>GitHub</span>
            <ExternalLink size={10} className="opacity-70" />
          </Link>
        </div>
      </div>
    </footer>
  )
}

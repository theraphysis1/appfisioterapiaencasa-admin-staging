interface TooltipProps {
  children: React.ReactNode
  text: string
}

export const Tooltip = ({ children, text }: TooltipProps) => {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64">
        <div className="bg-zinc-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-zinc-800"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
on run
  tell application "Terminal"
    activate
    do script ("/bin/zsh " & quoted form of "/Users/mohamedmansour/promptforge/scripts/launch-promptforge.zsh")
  end tell
end run

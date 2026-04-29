"""
Maps LLM token outputs to Workspace commands.
"""

def parse_action(token_text: str) -> dict:
    """
    Parse LLM output into a workspace command.
    Expected format: "ACTION: <type> <params>"
    """
    text = token_text.strip()
    
    if "create circle" in text.lower():
        return {"type": "workspace/select_tool", "tool": "circle"}
        
    if "click" in text.lower():
        # TODO: Parse coordinates
        return {"type": "workspace/click", "point": {"x": 0, "y": 0}}
        
    return None

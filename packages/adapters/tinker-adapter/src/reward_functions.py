def calculate_reward(prompt: str, workspace_snapshot: dict) -> float:
    """
    Reward based on task completion.
    """
    reward = 0.0
    
    # Basic shape existence check
    shapes = workspace_snapshot.get("shapes", [])
    
    if "circle" in prompt.lower():
        has_circle = any(s.get("type") == "circle" for s in shapes)
        if has_circle:
            reward += 1.0
            
    if "rectangle" in prompt.lower():
        has_rectangle = any(s.get("type") == "rectangle" for s in shapes)
        if has_rectangle:
            reward += 1.0
            
    # TODO: Add dimension checks
    
    return reward

import asyncio
import os
import tinker
from src.workspace_env import WorkspaceRLDataset, WorkspaceEnv
from src.bridge import get_bridge
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
if os.path.exists("../.env"):
    load_dotenv("../.env")

async def main():
    print("🚀 Starting Tinker Training Session with Bridge Integration")
    
    # Start bridge server
    print("🌉 Starting bridge server...")
    bridge = get_bridge(port=8765)
    server_task = asyncio.create_task(bridge.start())
    
    # Wait for bridge to be ready
    await asyncio.sleep(2)
    print("✅ Bridge server ready on ws://localhost:8765")
    
    # Initialize Tinker client
    api_key = os.getenv("TINKER_API_KEY")
    if not api_key:
        raise ValueError("TINKER_API_KEY not found")
        
    service_client = tinker.ServiceClient(api_key=api_key)
    
    # Create training client
    print(f"📦 Initializing model: {os.getenv('BASE_MODEL', 'meta-llama/Llama-3.2-1B')}")
    training_client = await service_client.create_lora_training_client_async(
        base_model=os.getenv("BASE_MODEL", "meta-llama/Llama-3.2-1B"),
        rank=int(os.getenv("LORA_RANK", 32)),
    )
    
    # Load dataset
    dataset = WorkspaceRLDataset("data/training-prompts.jsonl")
    
    # Training parameters
    num_iterations = 10
    batch_size = int(os.getenv("BATCH_SIZE", 2))
    
    print(f"🔄 Starting training loop ({num_iterations} iterations)...")
    
    total_reward = 0
    
    for i in range(num_iterations):
        print(f"\n📍 Iteration {i+1}/{num_iterations}")
        
        # Get batch of environments
        env_builders = dataset.get_batch(i)
        
        # Run episodes for each environment
        for env_builder in env_builders:
            envs = await env_builder.make_envs()
            
            for env in envs:
                # Get initial observation
                obs, stop = await env.initial_observation()
                
                episode_reward = 0
                step = 0
                
                print(f"   🎯 Task: {env.prompt}")
                
                # Run episode
                while step < env.max_steps:
                    # For now, use dummy action (in real training, LLM would generate this)
                    # TODO: Replace with actual LLM policy
                    action_text = f"create {env.prompt.split()[2]}" if "create" in env.prompt else "click"
                    
                    # Take step
                    result = await env.step(type('Action', (), {'text': action_text})())
                    
                    episode_reward += result.reward
                    step += 1
                    
                    # Check if episode is done
                    if result.episode_done:
                        break
                
                total_reward += episode_reward
                print(f"   💰 Episode reward: {episode_reward:.2f}")
        
        avg_reward = total_reward / ((i + 1) * batch_size)
        print(f"   📊 Average reward: {avg_reward:.2f}")
        
        # In real training, would do:
        # training_client.forward_backward(...)
        # training_client.optim_step()
        
        print(f"   ✅ Iteration {i+1} complete")
        
    print(f"\n🎉 Training session complete! Total reward: {total_reward:.2f}")

if __name__ == "__main__":
    asyncio.run(main())

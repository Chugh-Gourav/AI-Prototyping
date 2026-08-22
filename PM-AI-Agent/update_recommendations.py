import os
import json
from staysharp_agent.agent import root_agent

def main():
    print("Generating AI recommendations using PM-AI-Agent...")
    
    # We ask the agent to curate the reading list and output strictly as a JSON array
    # matching the expected schema.
    prompt = """
    Please run the curate_reading_list tool for the focus area "all".
    
    CRITICAL: Your final response MUST be a raw JSON array of objects.
    Do NOT include any markdown formatting (like ```json).
    Just output the raw JSON array.
    
    The schema for each object should be:
    {
      "title": "string",
      "author": "string",
      "source_and_url": "string (URL)",
      "published_date": "YYYY-MM-DD",
      "why_read_this": "string",
      "estimated_read_time": "string (e.g. '15 min')",
      "difficulty": "string (e.g. '🟢 Beginner')",
      "pillar": "string"
    }
    """
    
    response = root_agent.run(prompt)
    output_text = response.text.strip()
    
    # Clean up output just in case the LLM wrapped it in markdown anyway
    if output_text.startswith("```json"):
        output_text = output_text[7:]
    if output_text.startswith("```"):
        output_text = output_text[3:]
    if output_text.endswith("```"):
        output_text = output_text[:-3]
        
    output_text = output_text.strip()
    
    # Validate it is valid JSON
    try:
        data = json.loads(output_text)
        if not isinstance(data, list):
            raise ValueError("Expected a JSON array.")
            
        # Write to the React public directory
        output_path = os.path.join(
            os.path.dirname(__file__), 
            "bookmark-ui", 
            "public", 
            "recommendations.json"
        )
        
        with open(output_path, "w") as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully generated {len(data)} recommendations!")
        print(f"Saved to: {output_path}")
        
    except json.JSONDecodeError:
        print("Failed to parse the agent's output as JSON. Output was:")
        print(output_text)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()

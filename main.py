from flask import Flask, request, Response, render_template, jsonify
from twilio.twiml.voice_response import VoiceResponse, Gather
import openai
import os
import logging
import time

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Initialize OpenAI client
# The newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# Do not change this unless explicitly requested by the user
openai_api_key = os.environ.get("OPENAI_API_KEY")
client = openai.OpenAI(api_key=openai_api_key)

# System prompt for the AI agent
SYSTEM_PROMPT = """
You are a helpful AI support agent for a startup. Your responses should be:
1. Concise and to the point
2. Professional but friendly
3. Helpful and informative
4. Formatted for speech (avoid special characters, use natural pauses)

Keep responses under 30 seconds of spoken content. If you don't know an answer, 
say so clearly and offer to take the question to a human representative.
"""

# Store conversation history
conversation_store = {}

@app.route("/", methods=['GET'])
def index():
    """Render the status page"""
    return render_template('index.html')

@app.route("/status", methods=['GET'])
def status():
    """API endpoint to check service status"""
    api_status = "OK" if openai_api_key else "MISSING API KEY"
    return jsonify({
        "status": "running",
        "openai_api": api_status,
        "active_calls": len(conversation_store)
    })

@app.route("/voice", methods=['POST'])
def voice():
    """Entry point for new voice calls"""
    logger.debug("New call received")
    
    # Get the call SID to track this conversation
    call_sid = request.values.get('CallSid')
    
    # Create a new conversation history if this is a new call
    if call_sid not in conversation_store:
        conversation_store[call_sid] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Initial greeting
        response = VoiceResponse()
        response.say("Hello! I'm your AI assistant. How can I help you today?", voice='alice')
        
        # Gather the user's speech input
        gather = Gather(input='speech', action='/process_speech', method='POST', 
                       speech_timeout='auto', language='en-US')
        gather.say("", voice='alice')  # Empty say to create pause
        response.append(gather)
        
        # If no input received, retry
        response.redirect('/voice')
        
        return Response(str(response), mimetype='text/xml')
    else:
        # Continue the conversation
        return redirect_to_gather()

def redirect_to_gather():
    """Redirect to gather user input"""
    response = VoiceResponse()
    gather = Gather(input='speech', action='/process_speech', method='POST', 
                   speech_timeout='auto', language='en-US')
    gather.say("", voice='alice')  # Empty say to create pause
    response.append(gather)
    
    # If no input received, retry
    response.redirect('/voice')
    
    return Response(str(response), mimetype='text/xml')

@app.route("/process_speech", methods=['POST'])
def process_speech():
    """Process the user's speech input and generate a response"""
    call_sid = request.values.get('CallSid')
    user_input = request.values.get("SpeechResult")
    
    # Log user input for debugging
    logger.debug(f"User said: {user_input}")
    
    if not user_input:
        # If no speech was detected
        response = VoiceResponse()
        response.say("I'm sorry, I didn't hear anything. Could you please speak again?", voice='alice')
        return redirect_to_gather()
    
    # Add user input to conversation history
    if call_sid in conversation_store:
        conversation_store[call_sid].append(
            {"role": "user", "content": user_input}
        )
    else:
        # Initialize conversation if it doesn't exist
        conversation_store[call_sid] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input}
        ]
    
    # Generate AI response
    try:
        start_time = time.time()
        completion = client.chat.completions.create(
            model="gpt-4o",  # Using the latest model
            messages=conversation_store[call_sid],
            max_tokens=200  # Limit token count for faster response
        )
        ai_reply = completion.choices[0].message.content
        logger.debug(f"AI replied in {time.time() - start_time:.2f}s: {ai_reply}")
        
        # Add AI response to conversation history
        conversation_store[call_sid].append(
            {"role": "assistant", "content": ai_reply}
        )
        
        # Create Twilio response
        response = VoiceResponse()
        response.say(ai_reply, voice='alice')
        
        # Ask if the user needs anything else
        response.say("Is there anything else I can help you with?", voice='alice')
        
        # Gather next response
        gather = Gather(input='speech', action='/process_speech', method='POST',
                       speech_timeout='auto', language='en-US')
        gather.say("", voice='alice')  # Empty say to create pause
        response.append(gather)
        
        # If no response, ask again
        response.redirect('/process_speech')
        
        return Response(str(response), mimetype='text/xml')
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        # Handle errors gracefully
        response = VoiceResponse()
        response.say("I'm sorry, I'm having trouble processing your request. Let me try again.", voice='alice')
        return redirect_to_gather()

@app.route("/end_call", methods=['POST'])
def end_call():
    """Clean up when call ends"""
    call_sid = request.values.get('CallSid')
    
    if call_sid in conversation_store:
        # Clean up the conversation history
        del conversation_store[call_sid]
        logger.debug(f"Call {call_sid} ended and conversation removed")
    
    response = VoiceResponse()
    return Response(str(response), mimetype='text/xml')

if __name__ == "__main__":
    # Check if OpenAI API key is set
    if not openai_api_key:
        logger.warning("OPENAI_API_KEY environment variable not set")
    
    app.run(host="0.0.0.0", port=5000, debug=True)

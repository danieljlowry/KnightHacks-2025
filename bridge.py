import serial
import serial.tools.list_ports
from flask import Flask, make_response, request
import time

app = Flask(__name__)

# -----------------------------
# Auto-detect Arduino COM port
# -----------------------------
def find_arduino_port():
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        if 'Arduino' in p.description or 'CH340' in p.description or 'USB Serial' in p.description:
            return p.device
    if ports:
        return ports[0].device  # fallback to first available port
    return None

arduino_port = find_arduino_port()
if not arduino_port:
    print("❌ No Arduino detected. Make sure it's plugged in.")
    exit(1)

print(f"✅ Found Arduino on port {arduino_port}")

# Open serial connection
ser = serial.Serial(arduino_port, 115200, timeout=1)
time.sleep(2)  # wait for Arduino to reset

# -----------------------------
# Helper function
# -----------------------------
def send_to_arduino(cmd):
    ser.write((cmd + "\n").encode())
    line = ser.readline().decode().strip()
    print(f"Arduino: {line}")

# -----------------------------
# Flask server
# -----------------------------
@app.route('/status', methods=['GET'])
def status():
    state = request.args.get('state')
    if state in ['on_task', 'off_task', 'break_time']:
        send_to_arduino(state)
        response = make_response("OK", 200)
    else:
        response = make_response("Invalid state", 400)
    
    # Add CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# -----------------------------
# Main
# -----------------------------
if __name__ == '__main__':
    print("🌐 Starting Flask bridge on http://localhost:5000")
    app.run(port=5000)

from flask import Flask, request, jsonify

app = Flask(__name__)

# Mock data for discount codes
discount_codes = {
    "INDIRIM10": 10,
    "INDIRIM20": 20
}

@app.route('/api/validate_discount', methods=['POST'])
def validate_discount():
    data = request.json
    discount_code = data.get("discount_code")

    if discount_code in discount_codes:
        return jsonify({"valid": True, "discount": discount_codes[discount_code]}), 200
    else:
        return jsonify({"valid": False, "message": "Geçersiz indirim kodu!"}), 400

@app.route('/api/purchase', methods=['POST'])
def purchase():
    data = request.json
    slug = data.get("slug")
    price = data.get("price")

    # Simulate purchase logic
    if slug and price:
        return jsonify({"success": True, "message": f"Satın alma işlemi tamamlandı! Ders: {slug}, Fiyat: ₺{price}"}), 200
    else:
        return jsonify({"success": False, "message": "Eksik bilgi!"}), 400

if __name__ == '__main__':
    app.run(debug=True)
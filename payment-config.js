/* =========================================================
   DRx LEARNING HUB - PAYMENT SETTINGS
   Edit the values below. No other file needs to change.
   ========================================================= */

window.DRX_PAYMENT = {

    // true  = students pay online (Razorpay) and the course opens automatically.
    // false = manual UPI only (the admin enrolls after checking the payment).
    online: true,

    // Your UPI ID, for example "yourname@upi" or "9876543210@ybl".
    // Leave empty ("") if you only want students to contact you.
    upiId: "",

    // Name shown in the UPI app
    payeeName: "DRx Learning Hub",

    // Optional: put your QR image in the same folder and write its
    // file name here, for example "upi-qr.png". Leave "" for no QR.
    qrImage: "",

    // Extra line shown to the student after the payment steps
    note: "After payment, send the payment screenshot or UTR number through the Contact page. We will enroll you quickly."
};

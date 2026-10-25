/* =========================================================
   DRx LEARNING HUB - PAYMENT SETTINGS
   Edit the values below. No other file needs to change.
   ========================================================= */

window.DRX_PAYMENT = {

    // true  = AUTO: student pays online (Razorpay) and the course opens
    //         by itself as soon as the payment is verified.
    // false = MANUAL: student pays your UPI and sends the UTR number,
    //         you check your bank app and approve in one click.
    online: true,

    // Which gateway to use when online is true: "cashfree" or "razorpay"
    gateway: "cashfree",

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

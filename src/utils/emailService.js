import emailjs from '@emailjs/browser';

const SERVICE_ID  = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

export const isEmailConfigured = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

// Initialize once at module load (required by @emailjs/browser v4)
if (isEmailConfigured) {
    emailjs.init({ publicKey: PUBLIC_KEY });
}

export const sendFeesDueEmail = async (student) => {
    if (!isEmailConfigured) {
        return { success: false, simulated: true };
    }

    try {
        const response = await emailjs.send(
            SERVICE_ID, 
            TEMPLATE_ID,
            {
                to_name:      student.name,
                to_email:     student.email,  // must match "To Email" field in your EmailJS template
                fees_amount:  student.fees,
                message:      `Dear ${student.name}, your account shows outstanding fees of $${student.fees}. Please clear your dues at the earliest.`,
            }
        );
        console.log('EmailJS response:', response.status, response.text);
        return { success: true };
    } catch (err) {
        console.error('EmailJS error:', err);
        return { success: false, error: err.text || err.message || 'Unknown error' };
    }
};

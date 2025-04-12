// src/routes/stkRoutes.js

import express from 'express';
import axios from 'axios';
import moment from 'moment';
import Transaction from '../models/Transaction.js';
// src/routes/stkRoutes.js
import { getToken } from '../middlewares/tokenMiddleware.js';

const router = express.Router();

// Route to test token generation
router.get('/token', getToken, (req, res) => {
    res.status(200).json({
        message: 'Token generated successfully',
        token: req.token,
    });
});

// Route to handle STK push request
router.post('/stkpush', getToken, async (req, res) => {
    try {
        const token = req.token;
        let { phoneNumber, amount } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({ error: 'Phone number and amount are required fields.' });
        }

        if (phoneNumber.startsWith('07') && phoneNumber.length === 10) {
            phoneNumber = '254' + phoneNumber.substring(1);
        } else if (phoneNumber.length !== 12 || !phoneNumber.startsWith('254')) {
            return res.status(400).json({ error: 'Invalid phone number format.' });
        }

        const timestamp = moment().format('YYYYMMDDHHmmss');
        const businessShortCode = process.env.M_PESA_SHORT_CODE;
        const passKey = process.env.M_PESA_PASSKEY;
        const password = Buffer.from(`${businessShortCode}${passKey}${timestamp}`).toString('base64');

        const requestBody = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: businessShortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: phoneNumber,
            TransactionDesc: 'Payment for goods/services',
        };

        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            requestBody,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.ResponseCode === '0') {
            return res.status(200).json({
                message: 'Payment has been Initiated, Please check your phone to proceed.',
                checkoutRequestID: response.data.CheckoutRequestID,
                merchantRequestID: response.data.MerchantRequestID,
                responseDescription: response.data.ResponseDescription,
            });
        } else {
            return res.status(400).json({
                error: 'Failed to initiate your payment request.',
                responseDescription: response.data.ResponseDescription,
            });
        }
    } catch (error) {
        console.error('Error during while sending payment request:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Safaricom API Error',
                message: error.response.data,
            });
        }
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

router.post('/callback', async (req, res) => {
    try {
        const callbackData = req.body;
        const result_code = callbackData.Body.stkCallback.ResultCode;

        if (result_code !== 0) {
            const error_message = callbackData.Body.stkCallback.ResultDesc;
            return res.status(400).json({
                ResultCode: result_code,
                ResultDesc: error_message,
            });
        }

        const body = callbackData.Body.stkCallback.CallbackMetadata;
        const amount = body.Item.find((obj) => obj.Name === "Amount")?.Value;
        const mpesaCode = body.Item.find((obj) => obj.Name === "MpesaReceiptNumber")?.Value;
        const phone = body.Item.find((obj) => obj.Name === "PhoneNumber")?.Value;

        // Check if transaction already exists using mpesaReceiptNumber
        const existingTransaction = await Transaction.findOne({ mpesaReceiptNumber: mpesaCode });

        if (existingTransaction) {
            return res.status(400).json({
                message: 'Transaction already processed.',
                transaction: existingTransaction,
            });
        }

        const transaction = new Transaction({
            amount,
            mpesaReceiptNumber: mpesaCode,
            phoneNumber: phone,
            rawCallback: callbackData,
            status: 'completed',
        });

        await transaction.save();

        return res.status(200).json({
            message: "Callback processed and transaction saved.",
            transaction: { amount, mpesaCode, phone },
        });
    } catch (error) {
        console.error("Callback Error:", error);
        return res.status(500).json({
            error: "An error occurred while processing the callback.",
        });
    }
});


router.post('/stkquery', getToken, async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;
        if (!checkoutRequestID) {
            return res.status(400).json({ error: "CheckoutRequestID is required" });
        }

        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
            `${process.env.M_PESA_SHORT_CODE}${process.env.M_PESA_PASSKEY}${timestamp}`
        ).toString("base64");

        const requestBody = {
            BusinessShortCode: process.env.M_PESA_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        };

        const response = await axios.post(
            `${process.env.BASE_URL}/mpesa/stkpushquery/v1/query`,
            requestBody,
            {
                headers: {
                    Authorization: `Bearer ${req.token}`,
                },
            }
        );

        const { ResultCode, ResultDesc } = response.data;
        
        // Query for the transaction using CheckoutRequestID
        const transaction = await Transaction.findOne({ checkoutRequestID });

        if (!transaction) {
            return res.status(404).json({
                error: "Transaction not found for the given CheckoutRequestID.",
            });
        }

        // Update the transaction status based on the ResultCode
        let status = "failed";
        if (ResultCode === "0") {
            status = "completed"; // Successful payment
        }

        // Update the transaction in the database
        transaction.status = status;
        transaction.resultCode = ResultCode;
        transaction.resultDesc = ResultDesc;
        transaction.transactionDate = moment().toDate();

        // Save the updated transaction
        await transaction.save();

        return res.status(200).json({
            status: "Success",
            message: `Payment status: ${status}`,
            transaction: transaction,
            response: response.data,
        });
    } catch (error) {
        return res.status(500).json({
            error: "An error occurred while querying the STK payment status.",
            details: error.response?.data || error.message,
        });
    }
});


export default router;

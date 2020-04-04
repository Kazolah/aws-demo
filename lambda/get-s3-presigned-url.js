"use strict";

const AWS = require("aws-sdk");
const s3 = new AWS.S3({ signatureVersion: "v4" });
const bucketName = process.env.S3_BUCKET_NAME;

exports.handler = async (event, context) => {

    const key = event.queryStringParameters.fileName;
    const fullPath = 'uploads/' + key
    const params = {
        Bucket: bucketName,
        Key: fullPath,
        ContentType: "multipart/form-data",
        Expires: 120
    };
    try {
        const preSignedURL = await s3.getSignedUrl("putObject", params);
        let returnObject = {
            statusCode: 200,
            headers: {
                "access-control-allow-origin": "*"
            },
            body: JSON.stringify({
                fileUploadURL: preSignedURL
            })
        };
        return returnObject;
    } catch (e) {
        const response = {
            err: e.message,
            headers: {
                "access-control-allow-origin": "*"
            },
            body: "error occured"
        };
        return response;
    }
};
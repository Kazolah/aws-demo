import json
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    # TODO implement
    print(event)
    sgt = datetime.now() + timedelta(hours=8)
    dateString = sgt.strftime("%Y-%m-%d %H:%M:%S")
    
    table = 'messages'
    ddb = boto3.client('dynamodb')
    records = event['Records']
    for record in records:
        if 's3' in record:
            objectUrl = "https://%s.s3-%s.amazonaws.com/%s" % (
                record['s3']['bucket']['name'], 
                record['awsRegion'], 
                record['s3']['object']['key']
            )
    
            response = ddb.put_item(
                TableName=table,
                Item={
                    'created_at': {
                        'S': dateString
                    },
                    'message': {
                        'S': objectUrl
                    }
                }
            )
            print(response)
            return {
                'statusCode': 200,
                'body': 'Added URL for %s' % (objectUrl)
            }
    
    return {
        'statusCode': 200,
        'body': 'Did nothing'
    }
    

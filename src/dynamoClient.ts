/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * */
import { DynamoDB } from "aws-sdk";

export class DynamoDbClient {
  private dynamodbClient: DynamoDB.DocumentClient;

  constructor() {
    this.dynamodbClient = new DynamoDB.DocumentClient({
      convertEmptyValues: true,
    });
  }

  public async put(putParams: any) {
    console.log(`put into dynamodb with params: ${JSON.stringify(putParams)}`);
    return await this.dynamodbClient.put(putParams).promise();
  }

  public async update(updateParams: any) {
    console.log(
      `update a dynamodb item with params: ${JSON.stringify(updateParams)}`
    );

    return await this.dynamodbClient.update(updateParams).promise();
  }

  public async scanTable(scanParams: any) {
    console.log(`scanning dynamodb with params ${JSON.stringify(scanParams)}`);
    return await this.dynamodbClient.scan(scanParams).promise();
  }

  public async queryTable(queryParams: any) {
    console.log(
      `getting an item from dynamodb with params ${JSON.stringify(queryParams)}`
    );
    const queryData = await this.dynamodbClient.query(queryParams).promise();

    return queryData.Items[0];
  }

  public async delete(deleteParams: any) {
    console.log(
      `deleting from dynamodb with params ${JSON.stringify(deleteParams)}`
    );
    return await this.dynamodbClient.delete(deleteParams).promise();
  }
}

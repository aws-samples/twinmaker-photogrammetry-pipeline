/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * */
import axios from "axios";
import * as AWS from "aws-sdk";
import { PutObjectRequest } from "aws-sdk/clients/s3";
import { DynamoDbClient } from "./dynamoClient";

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const dynamodbClient = new DynamoDbClient();
const taskTrackTable: string = process.env.TASK_TRACK_TABLE;
const LB_URL: string = process.env.LB_URL;
const PROCESSED_BUCKET: string = process.env.PROCESSED_BUCKET;

exports.handler = async (event: any) => {
  let taskId;
  const scanParams = {
    TableName: taskTrackTable,
    Limit: 1
  };
  const scanData = await dynamodbClient.scanTable(scanParams);

  if (scanData && scanData.Items) {
    console.log(scanData);
    if (scanData.Count > 0) {
      for (const dbItem of scanData.Items) {
        taskId = dbItem.taskId;
      }
    } else {
      console.log('No task found, returning');
      return;
    }
  }
  
  console.log(`TaskId ${taskId}`);

  const { data } = await axios.get(
    `http://${LB_URL}:3000/task/${taskId}/info`
  );

  console.log(data);

  if (data.status.code == 40) {
    //Complete
    console.log(`TaskId ${taskId} complete`);
    const response = await axios.get(
      `http://${LB_URL}:3000/task/${taskId}/download/all.zip`,
      { responseType: "stream" }
    );

    console.log(response);

    const deleteResult = await dynamodbClient.delete({TableName: taskTrackTable, Key: {taskId: taskId}});

    console.log(deleteResult);

    const uploadParams: PutObjectRequest = {
      Bucket: PROCESSED_BUCKET,
      Key: "all.zip",
      Body: response.data,
    };

    await s3.upload(uploadParams).promise();
  }
};

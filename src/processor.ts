/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * */
import * as unzipper from "unzipper";
import * as AWS from "aws-sdk";
import axios from "axios";
import FormData from "form-data";
import { DynamoDbClient } from "./dynamoClient";
import { v4 as uuidv4 } from "uuid";

const s3 = new AWS.S3();
const dynamodbClient = new DynamoDbClient();
const taskTrackTable: string = process.env.TASK_TRACK_TABLE;
const LB_URL: string = process.env.LB_URL;

exports.handler = async (event: any) => {
  console.log(event);
  const bucket = process.env.LANDING_BUCKET;
  const filename = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const params = {
    Key: filename,
    Bucket: bucket,
  };

  const zip = s3
    .getObject(params)
    .createReadStream()
    .pipe(unzipper.Parse({ forceStream: true }));

  const { data } = await axios.post(
    `http://${LB_URL}:3000/task/new/init`,
    { name: `Task-${uuidv4()}` },
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  console.log(data);
  const taskId = data.uuid;

  await dynamodbClient.put({TableName: taskTrackTable, Item: {taskId: taskId, inProgress: true}});

  for await (const e of zip) {
    const entry = e;
    const type = entry.type;
    if (type === "File") {
      const entryName = entry.path;
      console.log(entryName);
      const fileData = await entry.buffer();
      const form = new FormData();
      form.append("images", fileData, { filename: entryName });

      const { data, status } = await axios.post(
        `http://${LB_URL}:3000/task/new/upload/${taskId}`,
        form,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );
      console.log(data);
    }
    entry.autodrain();
  }

  const result = await axios.post(
    `http://${LB_URL}:3000/task/new/commit/${taskId}`
  );
  console.log(result);
};

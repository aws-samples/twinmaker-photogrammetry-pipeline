/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * */
import * as unzipper from "unzipper";
import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from "fs";
import { PutObjectRequest } from "aws-sdk/clients/s3";
import { CreateSceneRequest, CreateSceneResponse } from "aws-sdk/clients/iottwinmaker";
const obj2gltf = require("obj2gltf");
const path = require("path");
const s3 = new AWS.S3();
const twinmaker = new AWS.IoTTwinMaker();

const WORKSPACE_BUCKET: string = process.env.TWINMAKER_WORKSPACE_BUCKET;
const TWINMAKER_WORKSPACE_ID = process.env.TWINMAKER_WORKSPACE_ID;
let IS_ODM = true;

exports.handler = async (event: any) => {
  console.log(event);
  const bucket = process.env.PROCESSED_BUCKET;
  const filename = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  console.log(`File name ${filename}`);

  if (filename.toLowerCase() != "all.zip") {
    IS_ODM = false;
  }

  const params = {
    Key: filename,
    Bucket: bucket,
  };

  const zip = s3
    .getObject(params)
    .createReadStream()
    .pipe(unzipper.Parse({ forceStream: true }));

  try {
    await rmdir('/tmp');
  } catch (e) {
    console.log('Could not delete /tmp dir, it probably does not exist');
  }
  await fs.mkdir("/tmp/odm_texturing");

  for await (const e of zip) {
    const entry = e;
    console.log(entry);
    const type = entry.type;
    if (type === "File") {
      const entryName = entry.path;
      console.log(entryName);
      if (entryName.toLowerCase().includes("odm_textured_model") //ODM OBJ naming convention
        || entryName.toLowerCase().includes("scene_mesh_textured")) { //DroneDeploy OBJ naming convention
        const fileData = await entry.buffer();
        console.log(fileData);
        await fs.writeFile(`/tmp/${entryName}`, fileData);
      }
    }
    entry.autodrain();

  }
  const options = {
    binary: true,
  };


  let glb;
  //Simple way to determine if we have an ODM or DroneDeploy generated OBJ
  if (IS_ODM) {
    console.log("Processing ODM OBJ file");
    glb = await obj2gltf("/tmp/odm_texturing/odm_textured_model_geo.obj", options);
  } else {
    console.log("Processing DroneDeploy OBJ file");
    glb = await obj2gltf("/tmp/scene_mesh_textured.obj", options);
  }

  console.log(glb);
  try {
    const uploadParams: PutObjectRequest = {
      Bucket: WORKSPACE_BUCKET,
      Key: "model.glb",
      Body: glb,
    };
    await s3.upload(uploadParams).promise();
    console.log('Uploaded model to workspace bucket');

    const uploadSceneParams: PutObjectRequest = {
      Bucket: WORKSPACE_BUCKET,
      Key: "scene.json",
      Body: JSON.stringify(getSceneJSON()),
    };
    await s3.upload(uploadSceneParams).promise();
    console.log('Uploaded scene metadata to workspace bucket');

    const createSceneRequest: CreateSceneRequest = {
      workspaceId: TWINMAKER_WORKSPACE_ID,
      sceneId: `PhotogrammeteryScene-${uuidv4()}`,
      contentLocation: `s3://${WORKSPACE_BUCKET}/scene.json`
    };
    const createSceneResponse: CreateSceneResponse = await twinmaker.createScene(createSceneRequest).promise();
    console.log(createSceneResponse);
  } catch (e) {
    console.error(e);
  }

};

const rmdir = async (dir: string) => {
  var list = await fs.readdir(dir);
  for(var i = 0; i < list.length; i++) {
      var filename = path.join(dir, list[i]);
      var stat = await fs.stat(filename);
      if(filename == "." || filename == "..") {
          // pass these files
      } else if(stat.isDirectory()) {
          // rmdir recursively
          await rmdir(filename);
      } else {
          // rm fiilename
          await fs.unlink(filename);
      }
  }
  await fs.rmdir(dir);
};


const getSceneJSON = () => {
  return {
    specVersion: "1.0",
    version: "1",
    unit: "meters",
    properties: {},
    nodes: [
      {
        name: "model",
        transform: {
          position: [
            0,
            0,
            0
          ],
          rotation: [
            0,
            0,
            0
          ],
          scale: [
            1,
            1,
            1
          ]
        },
        transformConstraint: {},
        children: [
          1
        ],
        components: [
          {
            type: "ModelRef",
            uri: `s3://${WORKSPACE_BUCKET}/model.glb`,
            modelType: "GLB"
          }
        ],
        properties: {}
      },
      {
        name: "Light",
        transform: {
          position: [
            0,
            0,
            0
          ],
          rotation: [
            0,
            0,
            0
          ],
          scale: [
            1,
            1,
            1
          ]
        },
        transformConstraint: {},
        components: [
          {
            type: "Light",
            lightType: "Ambient",
            lightSettings: {
              color: 16777215,
              intensity: 1,
              castShadow: true
            }
          }
        ],
        properties: {}
      }
    ],
    rootNodeIndexes: [
      0
    ]
  }
}

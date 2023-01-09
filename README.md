# AWS IoT TwinMaker Photogrammetry Pipeline

A sample pipeline that processes drone photography using photogrammetry, into an IoT TwinMaker scene containing the generated 3-dimensional model

## Pre-requisites
In order to deploy the code in this sample, you will need to have the following software available on your machine:-
- NPM - https://www.npmjs.com/
- Serverless framework - https://www.serverless.com/

## Deployment
To deploy the photogrammetry processing pipeline follow these steps

0. Clone this repository
1. Run ```npm install```
2. Run the following command in the root directory of the downloaded code ```sls package```
3. Navigate to the Amazon S3 console
4. Create an S3 bucket
5. Upload the Lambda deployment package that will have been created in the directory ```.serverless/pipeline.zip```
by step 1. 
6. Once the Lambda deployment package has been placed in S3, launch [this CloudFormation template](https://aws-iot-blog-assets.s3.amazonaws.com/twinmaker-photogrammetry-pipeline/cloudFormation.yml) 
7. In the Specify Stack Details screen, under the Parameters section, do the following:
 - Update the Prefix parameter value to a unique prefix for your bucket names.
This prefix will make sure the bucket names within the stack are globally
unique
 - Update the DeploymentBucket parameter value to the name of the bucket
you uploaded the Lambda deployment package to
 - If you are processing a large dataset, increase the Memory and CPU values
for the Fargate task, based on allowable values as described here
8. Choose Create stack to create the resources for the photogrammetry processing
pipeline
9. Once complete, navigate to the new S3 landing bucket. A link can be found in the
Resources tab

## Usage
The photogrammetry processing pipeline will automatically be initiated upon upload of a zip file containing geo-referenced images, to the landing bucket. The processing job can take over an hour (dependent on the number of images provided, and the CPU and memory provided within the Fargate processing task), and you can track the progress of the job by looking at the status within the Amazon CloudWatch logs of the Status Check Lambda. When a processing job is active, the Status Check Lambda will output the status of the job when it runs (on a 5-minutely schedule). The output includes the progress of the processing job as a percentage value as shown below.

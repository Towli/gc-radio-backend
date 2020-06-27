#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { DeployStack } from '../lib/deploy-stack'
require('dotenv').config()

const stackName = process.env.STACK_NAME || ''

const app = new cdk.App()

new DeployStack(app, stackName, {
  containerName: process.env.CONTAINER_NAME || '',
  containerTag: process.env.CONTAINER_TAG || '',
  environment: process.env.ENVIRONMENT || '',
})

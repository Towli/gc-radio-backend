#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { DeployStack } from '../lib/deploy-stack'
require('dotenv').config()

const stackName = process.env.STACK_NAME || ''

const app = new cdk.App()

new DeployStack(app, stackName, {
  ecrRepositoryName: process.env.ECR_REPOSITORY_NAME || '',
})

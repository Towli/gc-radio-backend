import * as cdk from '@aws-cdk/core'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecr from '@aws-cdk/aws-ecr'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns'
import { ContainerImage } from '@aws-cdk/aws-ecs'
import { Repository } from '@aws-cdk/aws-ecr'

export interface ICdkStackProps extends cdk.StackProps {
  ecrRepositoryName: string
}

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ICdkStackProps) {
    super(scope, id, props)

    const vpc = new ec2.Vpc(this, 'radio-backend-vpc', {
      maxAzs: 3, // Default is all AZs in region
    })

    const cluster = new ecs.Cluster(this, 'radio-backend-cluster', {
      vpc: vpc,
    })

    /**
     * Task definition with CloudWatch logging
     */
    const logDriver = new ecs.AwsLogDriver({ streamPrefix: 'radio-backend' })

    /**
     * ECR
     */
    const ecrRepositoryName = `${props.ecrRepositoryName}`

    // get respoitory
    const repository = Repository.fromRepositoryName(this, 'radio-backend', ecrRepositoryName)

    // build task image with repository
    const taskImage = ContainerImage.fromEcrRepository(repository)

    // Create a load-balanced Fargate service and make it public
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'radio-backend-service', {
      cluster: cluster, // Required
      cpu: 256, // Default is 256
      desiredCount: 1, // Default is 1
      taskImageOptions: {
        image: taskImage,
        enableLogging: true,
        logDriver: logDriver,
      },
      memoryLimitMiB: 512, // Default is 512
      publicLoadBalancer: true, // Default is false
    })
  }
}

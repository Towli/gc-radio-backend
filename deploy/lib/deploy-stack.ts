import * as cdk from '@aws-cdk/core'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecr from '@aws-cdk/aws-ecr'

export interface ICdkStackProps extends cdk.StackProps {
  ecrRepositoryName: string
}

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ICdkStackProps) {
    super(scope, id, props)

    const cluster = new ecs.Cluster(this, 'radio-backend-cluster')

    /**
     * Task definition with CloudWatch logging
     */
    const logging = new ecs.AwsLogDriver({ streamPrefix: 'radio-backend' })

    const taskDef = new ecs.FargateTaskDefinition(this, 'radio-backend-task-definition', {
      memoryLimitMiB: 512,
      cpu: 256,
    })

    const repository = new ecr.Repository(this, props.ecrRepositoryName, {
      repositoryName: props.ecrRepositoryName,
    })

    /**
     * NB: The first lifecycle rule that matches an image will be applied
     * against that image.
     */
    repository.addLifecycleRule({ tagPrefixList: ['latest'], maxImageCount: 3 })
    repository.addLifecycleRule({ maxImageAge: cdk.Duration.days(3) })

    taskDef.addContainer('appContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging,
    })

    new ecs.FargateService(this, 'FargateService', {
      cluster,
      taskDefinition: taskDef,
    })
  }
}

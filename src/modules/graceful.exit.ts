import * as http from 'http'
import * as helpers from './exit.helpers'

export default function initExitHandler(server: http.Server = null) {
  if (server) {
    server.on('error', async (error) => {
      console.error('SERVER_ERR', error)

      await helpers.flushConnections()

      server.close()
      process.exit(1)
    })
  }

  process.on('uncaughtException', async (error) => {
    console.error('UNCAUGHT_EXCEPTION', error)

    await helpers.flushConnections()

    if (server) {
      server.close(() => {
        process.exit(1)
      })
    } else {
      process.exit(1)
    }
  })

  process.on('SIGTERM', async () => {
    console.error('EXITING', 'SIGTERM received...')

    await helpers.flushConnections()

    if (server) {
      server.close(() => {
        process.exit(143)
      })
    } else {
      process.exit(143)
    }
  })

  process.on('SIGINT', async () => {
    console.error('EXITING', 'SIGINT received...')

    await helpers.flushConnections()

    if (server) {
      server.close(() => {
        process.exit(130)
      })
    } else {
      process.exit(130)
    }
  })

  process.on('exit', (code) => {
    console.error('EXITING', `Exiting with code ${code}.`)
  })
}

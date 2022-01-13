import { getUserDetails } from '$lib/common';
import * as db from '$lib/database';
import { generateDatabaseConfiguration } from '$lib/database';
import { startDatabaseProxy, stopDatabaseProxy } from '$lib/haproxy';
import type { RequestHandler } from '@sveltejs/kit';

export const post: RequestHandler<Locals, FormData> = async (request) => {
    const { status, body, teamId } = await getUserDetails(request);
    if (status === 401) return { status, body }

    const { id } = request.params
    const isPublic = request.body.get('isPublic') === 'true' ? true : false

    try {
        await db.setDatabase({ id, isPublic })

        const database = await db.getDatabase({ id, teamId })
        const { destinationDockerId, destinationDocker, port } = database
        const { privatePort } = generateDatabaseConfiguration(database)

        if (destinationDockerId) {
            if (isPublic) {
            console.log(isPublic)

            console.log('starting proxy')
                await startDatabaseProxy(destinationDocker, id, port, privatePort)
            } else {
                await stopDatabaseProxy(destinationDocker, port)
            }
        }

        return {
            status: 201
        }
    } catch (err) {
        console.log(err)
        return err
    }

}
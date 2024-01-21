import { Router } from 'itty-router/Router';
import { createCors } from 'itty-router/createCors';
import { json } from 'itty-router/json';
import { status } from 'itty-router/status';
import { error } from 'itty-router/error';

const { preflight, corsify } = createCors({
	methods: ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE'],
	origins: ['*'],
});
  
const router = Router();

router
	.all('*', preflight)
	.get('/__@dm1n__/routes', async (req, env, ctx) => await env.routes.list())
	.post('/__@dm1n__/routes', async (req, env, ctx) => {
		const r = await req.json();
		await env.routes.put(r.route, JSON.stringify(r), { metadata: { method: r.method }});
		return status(201);
	})
	.get('/__@dm1n__/routes/:name', async (req, env, ctx) => await env.routes.get(decodeURIComponent(req.params.name), { type: 'json' }))
	.delete('/__@dm1n__/routes/:name', async (req, env, ctx) => {
		await env.routes.delete(decodeURIComponent(req.params.name));
		return status(204);
	})
	.all('/setup', async (req, env, ctx) => {
		const routesData = [{
			key: '/todos/:id',
			metadata: { method: 'get' },
			value: JSON.stringify({
				handler: 'proxy', // redirect
				auth: 'jwt',
				rate_limit: 'none',
				circuit_breaker: 'none',
				proxy: {
					url: 'https://jsonplaceholder.typicode.com/todos/{id}',
					method: 'get',
					auth: 'none',
					forward_headers: ['X-Request-Id']
				}
			})
		}, {
			key: '/photos',
			metadata: { method: 'get' },
			value: JSON.stringify({
				handler: 'proxy', // redirect
				auth: 'jwt',
				rate_limit: 'none',
				circuit_breaker: 'none',
				proxy: {
					url: 'https://jsonplaceholder.typicode.com/photos',
					method: 'get',
					auth: 'none',
					forward_headers: ['X-Request-Id']
				}
			})
		}, {
			key: '/photos/:id',
			metadata: { method: 'get' },
			value: JSON.stringify({
				handler: 'proxy', // redirect
				auth: 'jwt',
				rate_limit: 'none',
				circuit_breaker: 'none',
				proxy: {
					url: 'https://jsonplaceholder.typicode.com/photos/{id}',
					method: 'get',
					auth: 'none',
					forward_headers: ['X-Request-Id']
				}
			})
		}];

		for (const r of routesData) {
			await env.routes.put(r.key, r.value, {
				metadata: r.metadata,
			});
		}

		return "Setup done!";
	})
	.all('/*', async (req, env, ctx) => {
		const routesData = await env.routes.list();
		const innerRouter = Router();
		for (const r of routesData.keys) {
			innerRouter[r.metadata.method](r.name, async (_req, _env, _ctx) => {
				var routeConfig = await env.routes.get(r.name, { type: 'json' });
				switch(routeConfig.handler) {
					case 'proxy': {
						let proxyUrl = routeConfig.proxy.url;
						for(const p in _req.params) {
							proxyUrl = proxyUrl.replace(`{${p}}`, _req.params[p]);
						}
						// todo: handle auth, rate-limit, circuit-breaker

						// todo: wrap or raw response, await fetch
						const innerRes = fetch(proxyUrl, {
							method: routeConfig.proxy.method,
							// todo forward headers
						});
						return innerRes;//json(await innerRes.json());
					}

					default: return error(500, 'Gateway misconfiguration')
				}
			});
		}
		return innerRouter.handle(req);
	})
  	.all('*', () => error(404));

export default {
	fetch: (request, env, ctx) => router.handle(request, env, ctx).then(json).catch(error).then(corsify)
};

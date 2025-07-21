import { Hono } from "hono"
import { proxy } from "hono/proxy"

const app = new Hono();

app.get("/*", (context) => {
    const { pathname, search } = new URL(context.req.url)
    return proxy(`https://registry.npmjs.org${pathname}${search}`)
})

export default app;
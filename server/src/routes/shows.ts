import { Hono } from 'hono'

const shows = new Hono()

shows.get(
  '/favorite',

  async (c) => {
    const bearerToken = c.req.header('Authorization')
    const token = bearerToken?.split('Bearer ')[1]

    if (!token) {
      return c.json(
        {
          error: 'Unauthorized',
        },
        403,
      )
    }

    const response = await fetch(
      'https://europe-west2-nts-ios-app.cloudfunctions.net/getShowFavouritesEurope',
      {
        method: 'POST',
        headers: {
          Authorization: bearerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            order_direction: 'desc',
            order_by: 'broadcast_date',
            paginate: false,
            cursor: null,
          },
        }),
      },
    )
    console.log({ response })
    if (response.ok) {
      return c.json(
        {
          error: 'Bad Response',
        },
        500,
      )
    }
    const data = await response.json()

    console.log(data)
    return c.json({ data }, 500)
  },
)

export { shows }

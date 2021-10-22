/*
|- ------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer''
|
*/

import Route from '@ioc:Adonis/Core/Route'
import Database from '@ioc:Adonis/Lucid/Database'

import './routes/applications'
import './routes/settings'
import './routes/api/v1'

Route.get('/', async ({ view }) => {

  const applications = await Database.from('applications').count('* as total')
  return view.render('pages/dashboard', { applicationsCount: applications[0].total })
})

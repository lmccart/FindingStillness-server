# Finding Stillness (server)

### Install
0. `npm install`

1. Install [imagesnap](https://github.com/danyshaanan/imagesnapjs):
  `sudo npm install -g imagesnapjs`
  
2. Make sure to fill out the `.env-sample` and rename it to `.env`.

3. Install expressjs:
  `npm install express -g`

4. Helpful for heroku testing: https://devcenter.heroku.com/articles/config-vars#production-and-development-modes.

### Running

`foreman start`


### Views

* BA page is at `/`
* Share page is at `/share.html`
* Controller is at `/controller.html`



### Modules & libs

#### Frontend
* http://jquery.com

#### Backend
* http://expressjs.com
* https://github.com/andris9/Nodemailer
* https://github.com/ttezel/twit
* https://github.com/TheAlphaNerd/node-osc
* https://github.com/danyshaanan/imagesnapjs
* https://github.com/dropbox/dropbox-js
* https://github.com/eugeneware/gifencoder

#### Etc
* http://nginx.org/en/docs/install.html
* http://learnaholic.me/2012/10/10/installing-nginx-in-mac-os-x-mountain-lion/
* http://www.hacksparrow.com/keep-node-js-script-running-after-logging-out-from-shell.html
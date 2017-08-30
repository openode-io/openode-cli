# openode-cli

[![Build status](https://travis-ci.org/martinlevesque/openode-cli.svg?branch=master)](https://travis-ci.org/martinlevesque/openode-cli)
[![Known Vulnerabilities](https://snyk.io/test/github/martinlevesque/openode-cli/badge.svg)](https://snyk.io/test/github/martinlevesque/openode-cli)



[opeNode](https://www.openode.io/) (https://www.openode.io/) command line to control and manage your Node.js instances efficiently.

[opeNode](https://www.openode.io/) is a reliable and fast Cloud Node.js hosting service to deploy your Node.js app instantly.

## Installation

```
npm install -g openode
```

## Usage

### Deploy an Instance

First, just go to your project directory in command line:

```
cd [your project directory]
```

And then just type:

```
openode deploy
```

This command will upload your local repository to the opeNode cloud, npm install,
then launch a secure container of your server, and then put it online. During this
command, you can also select between using a subdomain.openode.io or a custom domain.

Note that when you run *openode deploy* and your website is already running, it will update your files, update the environment variables (if they changed), and reload your website with 0-second-downtime.

#### Options

```
openode deploy [--clearNpm]
```

* *clearNpm:* Remote the node_modules folder before deploying.

### Pull / Backup

If you need to get your remote repository to your local, or need to backup your live website, you need to use the pull command, just like that:

```
openode pull
```

This will take the remote files and copy all of them in the current folder. Note that it will overwrite files. Also, if a given local file is not present remotely, it will not be erased locally. Thus, if you need a fresh pull, first remote the local content (*rm -rf \**) and then run *openode pull*.

### Status

You can obtain the info on your website instance via:

```
openode status
```

### Stopping an Instance

```
openode stop
```

### Restart an Instance

```
openode restart
```

### Erase all content

In order to clear all content of your cloud repository and stop your instance,
the following operation must done:

```
openode erase-all
```

## Custom Domain

To enable a custom domain, make sure to enter your custom domain while running
openode deploy.
Then you can manage your custom domain subdomains using the following commands.

### List aliases (subdomains)

```
openode list-aliases
```

### Add an alias (subdomain)

```
openode add-alias [hostname]
```

If your custom domain is for example mycustomdomain.com, then you can run

```
openode add-alias www.mycustomdomain.com
openode add-alias blog.mycustomdomain.com
```

in order to point mycustomdomain.com, www.mycustomdomain.com, and blog.mycustomdomain.com
to this instance.

### Removing an alias (subdomain)

```
openode del-alias [hostname]
```

## Defining storage areas

The storage areas are folders which will never be deleted. Those folders can
be used for storage purpose (database, configurations, etc.).

### List storage areas

```
openode storage-areas
```

### Add a storage area

```
openode add-storage-area [relative-folder]
```

Exemple [relative-folder]: db/

### Delete a storage area

```
openode del-storage-area [relative-folder]
```

Exemple [relative-folder]: db/

## License

ISC

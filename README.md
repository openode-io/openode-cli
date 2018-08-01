# openode-cli

[![NPM](https://nodei.co/npm/openode.png)](https://nodei.co/npm/openode/)

[![Build status](https://travis-ci.org/openode-io/openode-cli.svg?branch=master)](https://travis-ci.org/openode-io/openode-cli)

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
openode deploy [--clearNpm] [-t TOKEN -s SITE_NAME]
```

* *--clearNpm:* Remove the node_modules folder before deploying.
* *-t:* Provide an API token used for authentication.
* *-s:* Provide a site name.

*.openodeignore*: If you add a .openodeignore file in your repository, the
list of files provided in this file will get ignored (not sent). The format is the
same as the well known .gitignore.

### Sync - Send only the changed/new files

If you only need to send new files without deploying, then you can simply run:

```
openode sync
```

### Pull / Backup

If you need to get your remote repository to your local, or need to backup your live website, you need to use the pull command, just like that:

```
openode pull
```

This will take the remote files and copy all of them in the current folder. Note that it will overwrite files. Also, if a given local file is not present remotely, it will not be erased locally. Thus, if you need a fresh pull, first remove the local content (*rm -rf \**) and then run *openode pull*.

### Upgrading Your Plan

In order to upgrade your plan, you first have to look at the possible plans using:

```
openode plans
```

Pick the right *id*, and then you can upgrade by running:

```
openode set-plan PLAN_ID
```

You can always verify which plan is currently active with:

```
openode plan
```

### ci-conf

To integrate with your favorite continuous integration (CI) tool, you can use the
following command in order to generate the .openode file:

```
openode ci-conf TOKEN SITENAME
```

Note that you can avoid using *ci-conf* and provide the token and sitename by using the *-t* and *-s* options in the deploy command, for example: *openode deploy -t your_token -s your_sitename*.

### Status

You can obtain the info on your website instance via:

```
openode status
```

### Logs

You can obtain realtime logs by using the following command:

```
openode logs [-n nbLines]
```

* *-n:* Returns the N last lines for all log types.

### Stopping an Instance

```
openode stop
```

### Restart an Instance

```
openode restart
```

### Run a Remote Command

The following command allows to run a command in your running container:

```
openode cmd [yourCmd]
```

For example, if you run openode `cmd "ls -la"`, the list of files will be listed.

### Erase all content

In order to clear all content of your cloud repository and stop your instance,
the following operation must done:

```
openode erase-all
```

### Erase logs

In order to clear your logs in your cloud repository, the following operation
can be done:

```
openode erase-logs
```

### Custom Domain

To enable a custom domain, make sure to enter your custom domain while running
openode deploy.
Then you can manage your custom domain subdomains using the following commands.

#### List aliases (subdomains)

```
openode list-aliases
```

#### Add an alias (subdomain)

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

#### Removing an alias (subdomain)

```
openode del-alias [hostname]
```

### Defining storage areas

The storage areas are folders which will never be deleted. Those folders can
be used for storage purpose (database, configurations, etc.).

#### List storage areas

```
openode storage-areas
```

#### Add a storage area

```
openode add-storage-area [relative-folder]
```

Exemple [relative-folder]: db/

#### Delete a storage area

```
openode del-storage-area [relative-folder]
```

Exemple [relative-folder]: db/

#### Manage storage size limits

Extra storage capacity can be increased/decreased. To increase the storage limit
you can do the following command:

```
openode increase-storage [Amount GB]
```

and

```
openode decrease-storage [Amount GB]
```

to decrease the storage limit.

### Locations

The following commands allow to manage locations where your website is deployed.

#### List available locations

```
openode available-locations
```

#### Currently active locations

```
openode locations
```

#### Add a location

```
openode add-location [location-id]
```

#### Remove a location

```
openode del-location [location-id]
```

### Configs

Website configs, such as the build script path, can be managed via the CLI.

#### List available config variables

```
openode available-configs
```

#### Set a config

```
openode set-config [variable] [value]
```

## License

ISC

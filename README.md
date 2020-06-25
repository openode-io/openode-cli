# openode-cli

[![NPM](https://nodei.co/npm/openode.png)](https://nodei.co/npm/openode/)

[![Build status](https://travis-ci.org/openode-io/openode-cli.svg?branch=master)](https://travis-ci.org/openode-io/openode-cli)

[opeNode](https://www.openode.io/) (https://www.openode.io/) command line to control and manage your application instances efficiently.

[opeNode](https://www.openode.io/) provides reliable and fast Platform As A Services (PaaS) to deploy your web applications instantly.

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
openode deploy [-t TOKEN -s SITE_NAME]
```

* *-t:* Provide an API token used for authentication.
* *-s:* Provide a site name.

*.openodeignore*: If you add a .openodeignore file in your repository, the
list of files provided in this file will get ignored (not sent). The format is the
same as the well known .gitignore.

### Login

If you want to switch to a different user, just use:

```
openode login
```

### Restart

If you would like to deploy without synchronizing the files, this is the right command to use:

```
openode restart
```

### Sync - Send only the changed/new files

If you want to synchronize the files prior to deploy the following command can be used.

```
openode sync
```

Note that this is a temporarily remote location, *NOT* the live files. When you run *openode sync*, files are basically prepared. Then when you hit *openode deploy*, these files are built into an image.

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

### change-instance

To change the currently active instance, type:

```
openode change-instance [SITENAME]
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

You can view the logs by using the following command:

```
openode logs [-n nbLines]
```

* *-n:* (Optional) Returns the N last lines for all log types.

### Stopping an Instance

```
openode stop
```

### Run a Remote Command

The following command allows to run a command in your running container:

```
openode exec [yourCmd]
```

For example, if you run openode `exec "ls -la"`, the list of files will be listed.

### Clear remote repository

In order to clear the temp (see the *sync* command for more details) remote folder, run:

```
openode erase-all
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

#### list-dns

To list all DNS settings

```
openode list-dns
```

#### add-dns

A new DNS entry can be added with:

```
openode add-dns [domainName] [type] [value] [priority]
```

where the domainName is the domain name, type is the DNS entry type (A, TXT, etc.), and finally a value must be set. A priority can be set for MX type records.

#### del-dns

To delete a DNS entry:

```
openode del-dns [id]
```

where id corresponds to the id returned by list-dns.

### Persistence

By default no data can be persisted in your instance (immutable). In order to persist
data, you need to increase/decrease your storage. It will create an external persisted
disk which will remain available wether or not your instance is online.

#### Increase storage

You can increase your storage via:

```
openode increase-storage [amountGB]
```

where amountGB is the number of GBs to add.

where amountGB is the number of GBs to decrease.

#### Destroy storage

If you want to manually destroy your storage disk, you can do so via:

```
openode destroy-storage
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

### Snapshots

## Create a snapshot

```
openode create-snapshot <path>
```

Creates a snapshot of the content in given folder.

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

### Templates

Templates are Dockerfile which can be copied to your local. The Dockerfile is
what we use to deploy your instances. You are free to use as is a Dockerfile
template or adapt it to your needs.

#### List templates

To view the list of all available templates, type:

```
openode list-templates
```

#### Get info about a template

To get the template description:

```
openode template-info [template-name]
```

#### Retrieve a template

To get a copy of a template, just do:

```
openode template [template-name]
```

Note that if you do not specify a template name, the CLI will get the most
appropriate template based on your local repository.

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

#### Get the value of a given variable

```
openode config [variable]
```

## License

ISC

# configurator
Build static, environment-specific configurations for your app.

## What does this thing do, anyway?
configurator is "yet another config utility" (or YACF, if you like acronyms). Its purpose is to build 
and output configuration files created using one or more base configurations, properties, or environment variables.

Configurations are hierarchical in nature--that is, they can stack on each other, overriding previous values
depending on the target environment. Properties act the same way. More about this in a bit.

While other configuration packages seek to build configurations at runtime, this package assumes that you want
to build all--or at least most--of your configuration at *deploy* time. This can help you avoid many
hard-to-troubleshoot errors and catastrophic mistakes (e.g. suddenly realizing that your production app is
writing everything to your staging database, or worse yet, staging writing to production!).

When you pre-build environment-specific configurations at deploy time, you know _exactly_ what values your
app is using in a given environment, and if you ever have any doubt, all you have to do is look at one file.

configurator has a practically unlimited set of other "configurationy" uses too! Use it to build an app
manifest in YAML. Generate a `Dockerfile` that uses a specific environmental registry. Output additional
config or property files that need to be consumed elsewhere. In each case, every generated file has access
to the same set of inputs (if you so desire), thus enabling config re-use across a variety of situtations.
If it comes in a string, it can be configured.

## In a nutshell, you can:
- Build a configuration hierarchy into one config file.
- Substitute hierarchical property references into the configuration or any string-based file.

This can help ensure separation of duties, since sensitive values (e.g. production passwords) can be stored
by an ops team and later integrated into the configuration during some step of a deployment.

## Installation
To install, just run `npm install -g configurator`.

If you're running via an npm script, then you can list configurator as a `devDependency` and then call it
directly from the `npm run` command. npm should set the path appropriately so it "just works."

## Usage
Right now, configurator only provides a CLI, so there is no programmatic API (yet).

```
Usage: $0 [--option] [values]

Options (all are optional):
--configFiles                       One or more JSON files to be compiled hierarchically. Load
priority is last to first.
--propertyFiles                     One or more key/value files to be compiled hierarchically.
Load priority is last to first.
--configOut                         File or directory to which the compiled JSON config file
should be written.
--propertiesOut                     File or directory to which a compiled .properties file
should be written.
--filePairs                         A pair of files consisting of an input file that property
references and an output file or directory to which the
result should be written. Properties will be resolved via
the config and property files specified above.
```

## Examples

Let's assume we have a base configuration that's used in development with some values that change for production.

**base.json**
```
{
  "env": "local",
  "db_config": {
    "host": "localhost",
    "port": 5432,
    "username": "dbuser",
    "password": "myreallysecurepassword"
  }
}
```

**prod.json**
```
{
  "env": "prod",
  "db_config": {
    "host": "db-prod.mycompany.com",
    "password": "myreallysecureprodpassword"
  }
}
```
For development, we can just use `base.json` on its own, but when we head to production, we want to overlay 
`prod.json` on top so that its values overwrite the originals from `base.json`.

Using configurator, we can do that like this:
```
$ configurator --configFiles base.json prod.json --configOut config.json

Result:
{
  "env": "prod",
  "db_config": {
    "host": "db-prod.mycompany.com",
    "port": 5432,
    "username": "dbuser",
    "password": "myreallysecureprodpassword"
  }
}
```

### Using properties
Not impressed? OK, that's a relatively simple example. Let's try something a bit more complex.

In a microservice world, we'll probably have more than one app that needs to be deployed, and those 
apps might even need to be deployed into multiple production environments (e.g. a multi-region setup). 
If we're building our architecture properly, then we'll use a common naming convention for each service 
in the mix.

Let's assume we have these services:
- appdb-prod.mycompany.com
- appbackend-prod.mycompany.com
- appconsole-prod.mycompany.com

Since we never push code directly to production, we could replace 'prod' with a number of other test 
environments like 'stage', 'test', and 'dev'.

With the previous example, we'd have to build config overrides for each environment, which gets a bit 
tedious. But with configurator, we can replace `prod` in our base config with a property reference, 
like `target.env` and then provide a properties input file with the correct replacement value.

Here's an updated `base.json`:

**base.json**
```
{
  "env": "${target.env}",
  "db_config": {
    "host": "localhost",
    "port": 5432,
    "username": "dbuser",
    "password": "myreallysecurepassword"
},

  "services": {
    "database": "appdb-${target.env}.mycompany.com",
    "backend": "appbackend-${target.env}.mycompany.com",
    "console": "appconsole-${target.env}.mycompany.com",
  }
}
```

We'll use this one-line properties file as input:

**prod.properties**
```
target.env = prod
```

Now, let's run configurator again with some new options:
```
$ configurator --configFiles base.json prod.json --propertyFiles prod.properties --configOut config.json

Result:
{
  "env": "prod",
  "db_config": {
    "host": "db-prod.mycompany.com",
    "port": 5432,
    "username": "dbuser",
    "password": "myreallysecureprodpassword"
  },

  "services": {
    "database": "appdb-prod.mycompany.com",
    "backend": "appbackend-prod.mycompany.com",
    "console": "appconsole-prod.mycompany.com"
  }
}
```

Ah! Now *that's* useful!

### Internal property references

Property references within a config file need not only point to values from `.properties` files.
They can also reference other portions of the config JSON structure.

For example, we can streamline our base configuration file by referencing the input `target.env` only once in our config file's `env` value. From then on, all we need do is reference `${env}` elsewhere in the file. Here's the updated version.

**base.json**
```
{
  "env": "${target.env}",
  "db_config": {
    "host": "localhost",
    "port": 5432,
    "username": "dbuser",
    "password": "myreallysecurepassword"
  },

  "services": {
    "database": "appdb-${env}.mycompany.com",
    "backend": "appbackend-${env}.mycompany.com",
    "console": "appconsole-${env}.mycompany.com"
  }
}
```

Re-running the previous command will produce the same result.

If one property reference points to a value containing another property reference, configurator will automatically resolve each reference in the correct order.

## File pairs
configurator can also interpolate property references in any file that can be represented as text data.

Consider this CloudFoundry deployment manifest represented as yaml:
```
applications:
- disk_quota: 1024M
  host:       ${app.host_name}
  name:       My cool app
  command:    null
  path:       .
  domain:     mycompany.com
  instances:  ${app.num_instances}
  memory:     256M
```

If we have a property file (or even a hierarchy in our primary config) that includes values for the two `app` namespaced properties, we can output a deployment-ready version of this file.

A possible run might look like this: `$ configurator --configFiles base.json prod.json --propertyFiles prod.properties --filePairs manifest_template.yml manifest.yml`

This will work for both structured and unstructured files.

## Maintainers
- Matt Hamann (mhamann@us.ibm.com)
- Ted Kirby (otkirby@us.ibm.com)

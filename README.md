# configurator
Build static, environment-specific configurations for your app.

## What does this thing do, anyway?
configurator is "yet another config utility" or YACF. Its purpose is to build and output configuration files
created using one or more base configurations, properties, or environment variables.

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

## An example

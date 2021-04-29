# Sacculus

## Abstract

Basic Ethereum wallet built on React Native.

## Configuration (Android)

Regarding Firebase integration there's a valid `google-services.json.sample` to use it:

```
cp android/app/google-services.json.sample android/app/google-services.json
```

In addition to firebase configuration, there's a file called `config.json.sample`
that should be renamed to `config.json` and edited accordingly introducing:

- contractAddress
- ethereumRPCURL
- backendURL

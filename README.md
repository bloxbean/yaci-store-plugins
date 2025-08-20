# 🧩 Yaci Store Plugins

This repository contains a collection of custom plugins for [Yaci Store](https://github.com/bloxbean/yaci-store), written in supported languages such as **MVEL**, **SpEL**, **JavaScript**, and **Python**.

These plugins demonstrate how to filter, preprocess, or postprocess blockchain data during indexing. They can be directly plugged into your `yaci-store` deployment to enhance functionality without modifying core code.

## 📚 About Yaci Store Plugins

Yaci Store supports a flexible plugin framework that allows developers to write lightweight, dynamic logic for:

- Filtering incoming UTXOs, transactions, or metadata
- Running custom actions before or after data is stored
- Handling specific blockchain events
- Enriching or transforming data before persistence

## 🔌 Plugin Types

Each plugin must conform to one of the supported plugin types:

- `FILTER`: Filter data before it’s stored
- `PRE_ACTION`: Perform logic before saving data
- `POST_ACTION`: Run logic after data has been persisted
- `EVENT_HANDLER`: React to specific blockchain events

## 🚀 Getting Started

To use any plugin from this repository:

1. Clone or download this repo.
2. Copy the plugin file you want into the `plugins/` folder of your Yaci Store distribution.
3. Configure it in `application.properties` and `application-plugins.yml`:

## 🧑‍💻 Contributing

Want to add your own plugin? Contributions are welcome!

* Fork this repository
* Add your plugin under a relevant folder
* Include a short README or comment header explaining what your plugin does
* Open a pull request

## 📜 License

All plugins in this repo are released under the [MIT License](LICENSE), unless stated otherwise in individual plugin files.

🧠 **Learn more:** [Yaci Store Plugin Documentation](https://store.yaci.xyz/plugins/plugin-getting-started)

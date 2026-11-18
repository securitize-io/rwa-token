import { type Config } from "./types";
import { AssetController } from "./AssetController";
import { IdentityRegistry } from "./IdentityRegistry";
import { PolicyEngine } from "./PolicyEngine";
import { Provider } from "@anchor-lang/core";

/**
 * Represents a client for interacting with Real World Assets (RWA).
 */
export class RwaClient {
	/**s
   * Configuration for the RWA client.
   */
	config: Config;
	provider: Provider;
	assetController: AssetController;
	identityRegistry: IdentityRegistry;
	policyEngine: PolicyEngine;

	/**
   * Constructs a new instance of the RwaClient.
   * @param rwaConfig The configuration for the RWA client.
   * @param wallet Anchor wallet used for provider
   */
	constructor(config: Config, provider: Provider) {
		this.config = config;
		this.provider = provider;
		this.assetController = new AssetController(this);
		this.identityRegistry = new IdentityRegistry(this);
		this.policyEngine = new PolicyEngine(this);
	}
}

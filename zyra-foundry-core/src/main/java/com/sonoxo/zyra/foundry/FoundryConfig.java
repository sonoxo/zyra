package com.sonoxo.zyra.foundry;

public record FoundryConfig(
        String baseUrl,
        String token
) {
    public static FoundryConfig fromEnvironment() {
        return new FoundryConfig(
                System.getenv().getOrDefault("FOUNDRY_BASE_URL", ""),
                System.getenv().getOrDefault("FOUNDRY_TOKEN", "")
        );
    }

    public boolean configured() {
        return !baseUrl.isBlank() && !token.isBlank();
    }
}

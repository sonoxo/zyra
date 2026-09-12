package com.sonoxo.zyra.foundry;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class FoundryClient {

    private final FoundryConfig config;

    private final HttpClient client =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(20))
                    .build();

    public FoundryClient(FoundryConfig config) {
        this.config = config;
    }

    public boolean configured() {
        return config.configured();
    }

    public int ping() throws Exception {

        if (!configured()) {
            return -1;
        }

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(config.baseUrl()))
                        .timeout(Duration.ofSeconds(30))
                        .header(
                                "Authorization",
                                "Bearer " + config.token()
                        )
                        .GET()
                        .build();

        HttpResponse<String> response =
                client.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        return response.statusCode();
    }
}

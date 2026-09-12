package com.sonoxo.zyra;

import com.sonoxo.zyra.foundry.FoundryClient;
import com.sonoxo.zyra.foundry.FoundryConfig;

public class App {

    public static void main(String[] args) {

        FoundryConfig config =
                FoundryConfig.fromEnvironment();

        FoundryClient foundry =
                new FoundryClient(config);

        System.out.println("======================================");
        System.out.println(" ZYRA FOUNDRY CORE");
        System.out.println("======================================");
        System.out.println("STATUS  : ONLINE");
        System.out.println("JAVA    : " + System.getProperty("java.version"));
        System.out.println("MAVEN   : READY");
        System.out.println("VERSION : 0.2.0");
        System.out.println("TARGET  : PALANTIR FOUNDRY");

        if (!foundry.configured()) {
            System.out.println("FOUNDRY : WAITING FOR CREDENTIALS");
        } else {
            try {
                int status = foundry.ping();

                System.out.println(
                        "FOUNDRY : HTTP " + status
                );

                if (status >= 200 && status < 400) {
                    System.out.println("LINK    : CONNECTED");
                } else {
                    System.out.println("LINK    : REACHABLE / AUTH CHECK");
                }

            } catch (Exception e) {
                System.out.println("FOUNDRY : CONNECTION FAILED");
                System.out.println("ERROR   : " + e.getMessage());
            }
        }

        System.out.println("======================================");
    }
}

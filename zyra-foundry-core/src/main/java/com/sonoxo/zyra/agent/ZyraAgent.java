package com.sonoxo.zyra.agent;

import com.sonoxo.zyra.compute.ZyraTask;

public interface ZyraAgent {
    String id();
    String name();
    ZyraTask execute(ZyraTask task);
}

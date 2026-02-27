package com.heu.rag.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.*;

/**
 * Chat Persistence Configuration
 * Provides a dedicated ThreadPoolExecutor for async chat history persistence
 * to ensure streaming response is not blocked by database operations.
 */
@Configuration
@Slf4j
public class ChatPersistenceConfig {

    /**
     * ThreadPoolExecutor for chat history persistence tasks.
     * 
     * Configuration:
     * - Core threads: 2 (minimum threads to keep alive)
     * - Max threads: 5 (maximum concurrent persistence tasks)
     * - Keep alive time: 60 seconds (idle threads beyond core will be terminated)
     * - Queue: LinkedBlockingQueue with capacity 100 (buffers pending tasks)
     * - Rejection policy: CallerRunsPolicy (if queue is full, execute in caller
     * thread)
     * 
     * This ensures:
     * 1. Persistence tasks don't block SSE streaming
     * 2. Reasonable resource usage (bounded threads and queue)
     * 3. Graceful degradation under load (CallerRunsPolicy prevents task loss)
     */
    @Bean(name = "chatPersistenceExecutor")
    public ThreadPoolExecutor chatPersistenceExecutor() {
        int corePoolSize = 2;
        int maximumPoolSize = 5;
        long keepAliveTime = 60L;
        TimeUnit unit = TimeUnit.SECONDS;
        BlockingQueue<Runnable> workQueue = new LinkedBlockingQueue<>(100);
        ThreadFactory threadFactory = new ThreadFactory() {
            private int threadNumber = 1;
            /*
             * 为什么要自定义线程名称？（核心价值）
             * 如果你不自定义，JVM 会给线程分配默认名称（比如pool-1-thread-1），当线上出现问题时：
             * 日志里只能看到pool-1-thread-1报错，无法判断是「聊天持久化线程」还是「其他业务线程」；
             * 自定义名称chat-persistence-1后，一看日志就知道是「聊天记录保存的线程」出问题，快速定位故障范围。
             */
            @Override
            public Thread newThread(Runnable r) {
                Thread thread = new Thread(r, "chat-persistence-" + threadNumber++);
                /**
                 * 为什么要设置thread.setDaemon(true)？（守护线程的作用）
                 * 守护线程的核心特性：当 JVM 中所有非守护线程都结束时，守护线程会自动终止，不会阻止 JVM 退出；
                 * 对你的场景：
                 * 非守护线程：处理 SSE 推送、接收用户请求的核心线程（这些线程没结束，JVM 不能退出）；
                 * 守护线程：聊天持久化线程（即使还有未完成的保存任务，只要核心线程都结束了，JVM 可以正常退出，避免因后台保存任务卡住 JVM 关闭）；
                 * 注意：守护线程不影响正常运行时的任务执行，只是优化 JVM 退出逻辑，不用担心任务丢失（你的线程池还有CallerRunsPolicy兜底）。
                 */
                thread.setDaemon(true); // Daemon threads won't prevent JVM shutdown
                return thread;
            }
        };
        RejectedExecutionHandler handler = new ThreadPoolExecutor.CallerRunsPolicy();

        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                corePoolSize,
                maximumPoolSize,
                keepAliveTime,
                unit,
                workQueue,
                threadFactory,
                handler);

        log.info("Chat persistence ThreadPoolExecutor initialized: corePoolSize={}, maxPoolSize={}, queueCapacity={}",
                corePoolSize, maximumPoolSize, workQueue.remainingCapacity() + workQueue.size());

        return executor;
    }
}

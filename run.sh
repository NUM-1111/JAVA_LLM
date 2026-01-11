
#!/bin/bash
# Spring Boot Application Startup Script
# Ensures Java 17 is used for running the application

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

echo "Using Java:"
java -version

echo ""
echo "Checking for processes using port 8081..."
# Try to kill any process using port 8081
if command -v fuser &> /dev/null; then
    fuser -k 8081/tcp 2>/dev/null && echo "Cleared port 8081" || echo "Port 8081 is available"
elif command -v lsof &> /dev/null; then
    lsof -ti:8081 | xargs kill -9 2>/dev/null && echo "Cleared port 8081" || echo "Port 8081 is available"
else
    echo "Cannot check port (fuser/lsof not available), proceeding anyway..."
fi

echo ""
echo "Starting Spring Boot Application..."
mvn spring-boot:run


package np.com.abhishekojha.coremonolith;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoreMonolithApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoreMonolithApplication.class, args);
    }

}
